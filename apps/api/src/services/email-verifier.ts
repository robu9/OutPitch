import net from "node:net";
import { randomUUID } from "node:crypto";
import { resolveMx } from "node:dns/promises";
import { config } from "../config.js";

const EMAIL_SYNTAX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "10minutemail.com",
  "fakeinbox.com",
  "temp-mail.org",
]);

const ROLE_LOCAL_PARTS = new Set([
  "info",
  "admin",
  "support",
  "sales",
  "contact",
  "hello",
  "hr",
  "careers",
  "jobs",
  "recruiting",
  "talent",
  "office",
  "team",
  "help",
  "noreply",
  "no-reply",
]);

export interface EmailVerificationResult {
  valid: boolean;
  deliverability: "deliverable" | "undeliverable" | "risky" | "unknown";
  provider: "smtp";
  reason?: string;
  mxHost?: string;
  smtpCode?: number;
}

interface SmtpResponse {
  code: number;
  lines: string[];
}

function parseEmail(email: string): { local: string; domain: string } | null {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_SYNTAX.test(normalized)) return null;
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return null;
  return { local, domain };
}

function isDisposableDomain(domain: string): boolean {
  return (
    DISPOSABLE_DOMAINS.has(domain) ||
    domain.endsWith(".mailinator.com") ||
    domain.includes("tempmail")
  );
}

function isRoleAccount(local: string): boolean {
  const base = local.split("+")[0]?.split(".")[0] ?? local;
  return ROLE_LOCAL_PARTS.has(base);
}

async function pickMxHost(domain: string): Promise<string | null> {
  try {
    const records = await resolveMx(domain);
    if (!records.length) return null;
    records.sort((a, b) => a.priority - b.priority);
    return records[0]!.exchange;
  } catch {
    return null;
  }
}

function responseComplete(buffer: string): boolean {
  const lines = buffer.split(/\r?\n/).filter((line) => line.length > 0);
  const last = lines[lines.length - 1];
  return Boolean(last && /^\d{3} /.test(last));
}

function parseSmtpBuffer(buffer: string): SmtpResponse {
  const lines = buffer.split(/\r?\n/).filter((line) => line.length > 0);
  const last = lines[lines.length - 1] ?? "";
  const code = parseInt(last.slice(0, 3), 10) || 0;
  return { code, lines };
}

function sendCommand(socket: net.Socket, command: string): void {
  socket.write(`${command}\r\n`);
}

function waitForSmtpResponse(socket: net.Socket, timeoutMs: number): Promise<SmtpResponse> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onTimeout = () => {
      cleanup();
      reject(new Error("smtp_timeout"));
    };

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      if (!responseComplete(buffer)) return;
      cleanup();
      resolve(parseSmtpBuffer(buffer));
    };

    const timer = setTimeout(onTimeout, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function smtpHandshake(
  mxHost: string,
  recipient: string
): Promise<{ accepted: boolean; code: number; message: string }> {
  const timeoutMs = config.emailVerifierSmtpTimeoutMs;
  const heloDomain = config.emailVerifierHeloDomain;
  const fromEmail = config.emailVerifierFromEmail;

  const socket = net.createConnection({ host: mxHost, port: 25 });
  socket.setTimeout(timeoutMs);

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("error", reject);
      socket.once("timeout", () => reject(new Error("smtp_connect_timeout")));
    });

    await waitForSmtpResponse(socket, timeoutMs);

    sendCommand(socket, `EHLO ${heloDomain}`);
    const ehlo = await waitForSmtpResponse(socket, timeoutMs);
    if (ehlo.code < 200 || ehlo.code >= 400) {
      sendCommand(socket, `HELO ${heloDomain}`);
      const helo = await waitForSmtpResponse(socket, timeoutMs);
      if (helo.code < 200 || helo.code >= 400) {
        return { accepted: false, code: helo.code, message: helo.lines.join(" ") };
      }
    }

    sendCommand(socket, `MAIL FROM:<${fromEmail}>`);
    const mailFrom = await waitForSmtpResponse(socket, timeoutMs);
    if (mailFrom.code < 200 || mailFrom.code >= 300) {
      return { accepted: false, code: mailFrom.code, message: mailFrom.lines.join(" ") };
    }

    sendCommand(socket, `RCPT TO:<${recipient}>`);
    const rcpt = await waitForSmtpResponse(socket, timeoutMs);
    const accepted = rcpt.code >= 250 && rcpt.code < 300;

    try {
      sendCommand(socket, "QUIT");
      await waitForSmtpResponse(socket, timeoutMs);
    } catch {
      // ignore quit failures
    }

    return { accepted, code: rcpt.code, message: rcpt.lines.join(" ") };
  } finally {
    socket.destroy();
  }
}

// Catch-all is a property of the domain, not the individual mailbox — cache it so
// we probe once per domain instead of once per candidate email. Concurrent callers
// for the same domain share the single in-flight probe.
const CATCH_ALL_TTL_MS = 10 * 60 * 1000;
const catchAllCache = new Map<string, { at: number; promise: Promise<boolean> }>();

async function isCatchAllDomain(mxHost: string, domain: string): Promise<boolean> {
  const cached = catchAllCache.get(domain);
  if (cached && Date.now() - cached.at < CATCH_ALL_TTL_MS) {
    return cached.promise;
  }

  const probe = `no-mailbox-${randomUUID().slice(0, 8)}@${domain}`;
  const promise = smtpHandshake(mxHost, probe)
    .then((result) => result.accepted)
    .catch(() => false);

  catchAllCache.set(domain, { at: Date.now(), promise });
  return promise;
}

// Once a connect times out (port 25 blocked outbound — typical on cloud hosts),
// stop paying the full timeout on every subsequent email; short-circuit fast.
let smtpBlocked = false;

/** In-house verification: syntax → DNS MX → SMTP RCPT TO (no third-party API). */
export async function verifyEmailExists(email: string): Promise<EmailVerificationResult> {
  const parsed = parseEmail(email);
  if (!parsed) {
    return {
      valid: false,
      deliverability: "undeliverable",
      provider: "smtp",
      reason: "invalid_syntax",
    };
  }

  if (isDisposableDomain(parsed.domain)) {
    return {
      valid: false,
      deliverability: "undeliverable",
      provider: "smtp",
      reason: "disposable",
    };
  }

  const mxHost = await pickMxHost(parsed.domain);
  if (!mxHost) {
    return {
      valid: false,
      deliverability: "undeliverable",
      provider: "smtp",
      reason: "no_mx",
    };
  }

  // Port 25 already known blocked — don't wait on a doomed connect for every email.
  // Mirrors the old catch-path result (rejected), just without the timeout wait.
  if (smtpBlocked) {
    return {
      valid: false,
      deliverability: isRoleAccount(parsed.local) ? "risky" : "unknown",
      provider: "smtp",
      reason: isRoleAccount(parsed.local) ? "role_account" : "smtp_unavailable",
      mxHost,
    };
  }

  try {
    const catchAll = await isCatchAllDomain(mxHost, parsed.domain);
    if (catchAll) {
      return {
        valid: false,
        deliverability: "risky",
        provider: "smtp",
        reason: "catch_all",
        mxHost,
      };
    }

    const smtp = await smtpHandshake(mxHost, email.trim().toLowerCase());
    if (smtp.accepted) {
      return {
        valid: true,
        deliverability: "deliverable",
        provider: "smtp",
        mxHost,
        smtpCode: smtp.code,
      };
    }

    const hardReject = smtp.code === 550 || smtp.code === 551 || smtp.code === 553;
    return {
      valid: false,
      deliverability: hardReject ? "undeliverable" : "unknown",
      provider: "smtp",
      reason: hardReject ? "mailbox_not_found" : `smtp_${smtp.code}`,
      mxHost,
      smtpCode: smtp.code,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "smtp_error";

    // A connect timeout means port 25 is almost certainly blocked outbound — latch
    // it so the rest of this run short-circuits instead of waiting on every email.
    if (message === "smtp_connect_timeout") {
      smtpBlocked = true;
      console.warn("SMTP connect timed out — assuming port 25 blocked; skipping further SMTP probes this run");
    }

    // Port 25 blocked or remote unreachable — fall back to MX + role checks only
    if (isRoleAccount(parsed.local)) {
      return {
        valid: false,
        deliverability: "risky",
        provider: "smtp",
        reason: "role_account",
        mxHost,
      };
    }

    console.warn(`SMTP verification failed for ${email} via ${mxHost}: ${message}`);
    return {
      valid: false,
      deliverability: "unknown",
      provider: "smtp",
      reason: message,
      mxHost,
    };
  }
}

export async function filterVerifiedEmails<T extends { email: string }>(
  candidates: T[]
): Promise<{ verified: T[]; rejected: Array<T & { rejectionReason: string }> }> {
  const verified: T[] = [];
  const rejected: Array<T & { rejectionReason: string }> = [];

  for (const candidate of candidates) {
    const result = await verifyEmailExists(candidate.email);
    if (result.valid) {
      verified.push(candidate);
    } else {
      rejected.push({
        ...candidate,
        rejectionReason: result.reason ?? result.deliverability,
      });
    }
  }

  return { verified, rejected };
}
