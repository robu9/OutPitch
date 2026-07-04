"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Brain,
  CheckCircle2,
  Linkedin,
  Mail,
  RefreshCw,
  Unplug,
  XCircle,
  Terminal,
  ShieldCheck,
  Cpu,
  Database,
  MessageCircle,
} from "lucide-react";

type ConnectionStatus = {
  linkedinConnected: boolean;
  linkedinTokenExpired?: boolean;
  gmailConnected: boolean;
  linkedinProfileSynced?: boolean;
  linkedinSyncing?: boolean;
  whatsappNumber?: string | null;
  whatsappVerified?: boolean;
  onboardingDone: boolean;
};

export default function SettingsPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthHandled = useRef(false);
  const [status, setStatus] = useState<ConnectionStatus>({
    linkedinConnected: false,
    gmailConnected: false,
    onboardingDone: false,
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [whatsappInput, setWhatsappInput] = useState("");
  const [whatsappCode, setWhatsappCode] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!user) return null;
    const next = await apiFetch<ConnectionStatus>("/api/onboarding/status", {
      clerkUserId: user.id,
    });
    setStatus(next);
    return next;
  }, [user]);

  const syncLinkedIn = useCallback(async () => {
    if (!user) return;
    setLoading("linkedin-sync");
    setError(null);
    try {
      await apiFetch("/api/onboarding/linkedin-sync", {
        method: "POST",
        clerkUserId: user.id,
      });
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync LinkedIn profile");
    } finally {
      setLoading(null);
    }
  }, [user, loadStatus]);

  useEffect(() => {
    loadStatus().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load connection status");
    });
  }, [loadStatus]);

  useEffect(() => {
    if (!user || oauthHandled.current) return;

    const connect = searchParams.get("connect");
    const oauthStatus = searchParams.get("status");
    if (connect !== "linkedin") return;

    oauthHandled.current = true;

    if (oauthStatus === "success") {
      syncLinkedIn()
        .finally(() => router.replace("/settings"))
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to sync LinkedIn profile");
        });
      return;
    }

    if (oauthStatus === "failed") {
      router.replace("/settings");
      setError("LinkedIn connection was cancelled or failed. Please try again.");
    }
  }, [user, searchParams, router, syncLinkedIn]);

  async function connectLinkedIn() {
    if (!user) return;
    setLoading("linkedin-connect");
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>(
        "/api/onboarding/connect/linkedin",
        { clerkUserId: user.id }
      );
      if (!url) {
        setError("No OAuth URL returned. Check your Composio configuration.");
        return;
      }
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect LinkedIn");
    } finally {
      setLoading(null);
    }
  }

  async function disconnectLinkedIn() {
    if (!user) return;
    setLoading("linkedin-disconnect");
    setError(null);
    try {
      await apiFetch("/api/onboarding/disconnect/linkedin", {
        method: "POST",
        clerkUserId: user.id,
      });
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect LinkedIn");
    } finally {
      setLoading(null);
    }
  }

  async function connectGmail() {
    if (!user) return;
    setLoading("gmail-connect");
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>(
        "/api/onboarding/connect/gmail",
        { clerkUserId: user.id }
      );
      if (!url) {
        setError("No OAuth URL returned. Check your Composio configuration.");
        return;
      }
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Gmail");
    } finally {
      setLoading(null);
    }
  }

  async function disconnectGmail() {
    if (!user) return;
    setLoading("gmail-disconnect");
    setError(null);
    try {
      await apiFetch("/api/onboarding/disconnect/gmail", {
        method: "POST",
        clerkUserId: user.id,
      });
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Gmail");
    } finally {
      setLoading(null);
    }
  }

  async function linkWhatsApp() {
    if (!user || !whatsappInput.trim()) return;
    setLoading("whatsapp-link");
    setError(null);
    try {
      const { code } = await apiFetch<{ code: string }>("/api/whatsapp/link", {
        method: "POST",
        clerkUserId: user.id,
        body: JSON.stringify({ number: whatsappInput.trim() }),
      });
      setWhatsappCode(code);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link WhatsApp");
    } finally {
      setLoading(null);
    }
  }

  const linkedinSyncing = loading === "linkedin-sync" || status.linkedinSyncing;

  return (
    <AppShell>
      <PageHeader
        title="Connection Matrix"
        description="Manage Composio OAuth accounts and Cognee neural graph integrations"
        meta="MATRIX // INTEGRATIONS & MEMORY CONFIGURATION"
      />

      <div className="flex-1 overflow-y-auto bg-[#050505]">
        <div className="mx-auto max-w-4xl px-5 py-8">
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-md border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3 text-xs font-mono text-[#ef4444]"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>[SYSTEM ERROR]: {error}</span>
            </div>
          )}

          {/* SECTION 1: OAUTH CONNECTIONS */}
          <section aria-labelledby="connections-heading">
            <div className="flex items-center justify-between mb-4">
              <h2
                id="connections-heading"
                className="text-xs font-mono font-bold uppercase tracking-widest text-accent flex items-center gap-2"
              >
                <Terminal className="h-3.5 w-3.5" />
                SECTION 01 // COMPOSIO OAUTH INTEGRATIONS
              </h2>
              <Badge variant="success">OAUTH 2.0 ENCRYPTED</Badge>
            </div>

            <div className="rounded-xl border border-[#2a2a2a] bg-[#080808] overflow-hidden shadow-xl divide-y divide-[#1f1f1f]">
              {/* LinkedIn Row */}
              <ConnectionRow
                icon={Linkedin}
                name="LinkedIn Professional Graph"
                description={
                  linkedinSyncing
                    ? "Syncing career experience and skills into Cognee dataset…"
                    : status.linkedinTokenExpired
                      ? "OAuth token expired — re-authenticate to maintain memory sync"
                      : status.linkedinConnected
                        ? status.linkedinProfileSynced
                          ? "Connected & Synced — career history stored in Cognee graph"
                          : "Connected — click Sync to compound your career history"
                        : "Required for matching candidate tone and technical seniority"
                }
                connected={status.linkedinConnected && !status.linkedinTokenExpired}
                statusBadge={
                  status.linkedinConnected
                    ? linkedinSyncing
                      ? { label: "SYNCING GRAPH", variant: "warning" as const }
                      : status.linkedinProfileSynced
                        ? { label: "COGNEE SYNCED", variant: "success" as const }
                        : { label: "OAUTH ACTIVE", variant: "primary" as const }
                    : undefined
                }
                actions={
                  status.linkedinConnected ? (
                    <div className="flex items-center gap-2">
                      {status.linkedinTokenExpired ? (
                        <Button
                          size="sm"
                          variant="terminal"
                          className="h-8 text-xs font-mono bg-[#161616] text-white hover:bg-[#2a2a2a]"
                          onClick={() => {
                            disconnectLinkedIn().then(() => connectLinkedIn());
                          }}
                          disabled={loading !== null}
                        >
                          {loading && <Spinner className="h-3 w-3 text-accent mr-1" />}
                          Re-authenticate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="terminal"
                          className="h-8 text-xs font-mono bg-[#161616] text-white hover:bg-[#2a2a2a]"
                          onClick={syncLinkedIn}
                          disabled={loading !== null}
                        >
                          {loading === "linkedin-sync" ? (
                            <Spinner className="h-3 w-3 text-accent mr-1" />
                          ) : (
                            <RefreshCw className="h-3 w-3 mr-1 text-accent" aria-hidden />
                          )}
                          Sync Graph
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs font-mono"
                        onClick={disconnectLinkedIn}
                        disabled={loading !== null}
                      >
                        {loading === "linkedin-disconnect" ? (
                          <Spinner className="h-3 w-3 mr-1" />
                        ) : (
                          <Unplug className="h-3 w-3 mr-1 text-[#ef4444]" aria-hidden />
                        )}
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="terminal"
                      className="h-8 text-xs font-mono bg-white text-black hover:bg-[#e0e0e0] font-bold"
                      onClick={connectLinkedIn}
                      disabled={loading !== null}
                    >
                      {loading === "linkedin-connect" && <Spinner className="h-3 w-3 mr-1" />}
                      Connect LinkedIn OAuth
                    </Button>
                  )
                }
              />

              {/* Gmail Row */}
              <ConnectionRow
                icon={Mail}
                name="Google Workspace / Gmail Inbox"
                description="Direct OAuth dispatch via Composio. Drafts land straight in your inbox or send automatically with reply tracking."
                connected={status.gmailConnected}
                statusBadge={
                  status.gmailConnected
                    ? { label: "INBOX CONNECTED", variant: "success" as const }
                    : undefined
                }
                actions={
                  status.gmailConnected ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs font-mono"
                      onClick={disconnectGmail}
                      disabled={loading !== null}
                    >
                      {loading === "gmail-disconnect" && <Spinner className="h-3 w-3 mr-1" />}
                      Disconnect Inbox
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="terminal"
                      className="h-8 text-xs font-mono bg-white text-black hover:bg-[#e0e0e0] font-bold"
                      onClick={connectGmail}
                      disabled={loading !== null}
                    >
                      {loading === "gmail-connect" && <Spinner className="h-3 w-3 mr-1" />}
                      Connect Gmail OAuth
                    </Button>
                  )
                }
              />
            </div>
          </section>

          {/* SECTION 2: WHATSAPP AGENT ACCESS */}
          <section className="mt-12" aria-labelledby="whatsapp-heading">
            <div className="flex items-center justify-between mb-4">
              <h2
                id="whatsapp-heading"
                className="text-xs font-mono font-bold uppercase tracking-widest text-accent flex items-center gap-2"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                SECTION 02 // WHATSAPP AGENT ACCESS
              </h2>
              <Badge variant={status.whatsappVerified ? "success" : "muted"}>
                {status.whatsappVerified ? "CHANNEL LINKED" : "NOT LINKED"}
              </Badge>
            </div>

            <div className="rounded-xl border border-[#2a2a2a] bg-[#080808] p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#111111] text-white">
                  <MessageCircle className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-white">
                      Chat with Outpitch on WhatsApp
                    </h3>
                    {status.whatsappVerified && (
                      <Badge variant="success">
                        {status.whatsappNumber ?? "VERIFIED"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-[#888888] font-mono text-pretty">
                    Link your WhatsApp number to run company searches, draft and send
                    outreach, and refresh your LinkedIn profile — the full agent, from
                    your phone. Enter your number, then text the 6-digit code we give you
                    to the Outpitch business number.
                  </p>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <input
                      type="tel"
                      inputMode="tel"
                      value={whatsappInput}
                      onChange={(e) => setWhatsappInput(e.target.value)}
                      placeholder="+1 555 123 4567"
                      className="flex-1 rounded-md border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-xs font-mono text-white placeholder:text-[#555] focus:border-accent focus:outline-none"
                    />
                    <Button
                      size="sm"
                      variant="terminal"
                      className="h-9 text-xs font-mono bg-white text-black hover:bg-[#e0e0e0] font-bold"
                      onClick={linkWhatsApp}
                      disabled={loading !== null || !whatsappInput.trim()}
                    >
                      {loading === "whatsapp-link" && (
                        <Spinner className="h-3 w-3 mr-1" />
                      )}
                      {status.whatsappVerified ? "Re-link Number" : "Link WhatsApp"}
                    </Button>
                  </div>

                  {whatsappCode && !status.whatsappVerified && (
                    <div className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-xs font-mono text-white">
                      Text this code from WhatsApp to finish linking:{" "}
                      <span className="font-bold tracking-widest text-accent">
                        {whatsappCode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: COGNEE PERSISTENT GRAPH */}
          <section className="mt-12" aria-labelledby="memory-heading">
            <div className="flex items-center justify-between mb-4">
              <h2
                id="memory-heading"
                className="text-xs font-mono font-bold uppercase tracking-widest text-accent flex items-center gap-2"
              >
                <Brain className="h-3.5 w-3.5" />
                SECTION 03 // COGNEE PERSISTENT MEMORY GRAPH
              </h2>
              <Badge variant="primary" pulse>NEURAL STORAGE ACTIVE</Badge>
            </div>

            <div className="rounded-xl border border-[#2a2a2a] bg-[#080808] p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="dot-grid absolute inset-0 opacity-20 pointer-events-none" aria-hidden />

              <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#111111] text-white">
                  <Database className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-white">Cognee Neural Knowledge Dataset</h3>
                    <Badge variant="muted">COMPOUNDING</Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-[#888888] font-mono text-pretty">
                    Outpitch stores your profile nuances, chat instructions, and per-company research in Cognee graph storage. This context prevents hallucinated cover letters and ensures outreach sounds like an experienced peer Staff Engineer.
                  </p>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    <div className="rounded border border-[#1f1f1f] bg-[#111111] p-3 flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0" />
                      <span className="text-white">User Profile &amp; Tone Graph</span>
                    </div>
                    <div className="rounded border border-[#1f1f1f] bg-[#111111] p-3 flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0" />
                      <span className="text-white">Per-Company Research Datasets</span>
                    </div>
                    <div className="rounded border border-[#1f1f1f] bg-[#111111] p-3 flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0" />
                      <span className="text-white">Persistent Session Recall</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function ConnectionRow({
  icon: Icon,
  name,
  description,
  connected,
  statusBadge,
  actions,
}: {
  icon: typeof Linkedin;
  name: string;
  description: string;
  connected: boolean;
  statusBadge?: { label: string; variant: "success" | "primary" | "warning" };
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-[#0c0c0c]">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
            connected
              ? "border-accent/40 bg-surface text-accent"
              : "border-[#1f1f1f] bg-[#0c0c0c] text-[#888888]"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{name}</h3>
            {statusBadge && <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>}
          </div>
          <p className="mt-1 text-xs text-[#888888] font-mono leading-relaxed max-w-lg text-pretty">
            {description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:ml-4">{actions}</div>
    </div>
  );
}
