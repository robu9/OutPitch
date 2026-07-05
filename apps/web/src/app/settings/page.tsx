"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Brain,
  CheckCircle2,
  Linkedin,
  Mail,
  MessageCircle,
  RefreshCw,
  Unplug,
  XCircle,
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
    // Composio returns to /settings?connect=<toolkit> after OAuth (no status param).
    const connect = searchParams.get("connect");
    if (connect !== "linkedin" && connect !== "gmail") return;
    oauthHandled.current = true;

    const oauthStatus = searchParams.get("status");
    const failed = oauthStatus === "failed";
    // Always clean the query param out of the URL.
    router.replace("/settings");

    if (failed) {
      setError(`${connect === "gmail" ? "Gmail" : "LinkedIn"} connection was cancelled or failed.`);
      return;
    }

    // On a successful LinkedIn connect, kick off the profile sync.
    if (connect === "linkedin") {
      syncLinkedIn().catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to sync LinkedIn profile");
      });
    } else {
      loadStatus().catch(() => {});
    }
  }, [user, searchParams, router, syncLinkedIn, loadStatus]);

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
        setError("No OAuth URL returned.");
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
        setError("No OAuth URL returned.");
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
        title="Settings"
        description="Manage connections and integrations"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 py-8 space-y-10">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3 text-sm text-foreground"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
              {error}
            </div>
          )}

          <section>
            <h2 className="text-sm font-medium text-foreground">Connections</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Link accounts to power discovery and outreach.
            </p>

            <div className="mt-4 space-y-3">
              <ConnectionRow
                icon={Linkedin}
                name="LinkedIn"
                description={
                  linkedinSyncing
                    ? "Syncing your profile..."
                    : status.linkedinConnected
                      ? status.linkedinProfileSynced
                        ? "Connected and synced to memory"
                        : "Connected — sync your profile"
                      : "Import career history for better matching"
                }
                connected={status.linkedinConnected && !status.linkedinTokenExpired}
                badge={
                  status.linkedinConnected
                    ? linkedinSyncing
                      ? "Syncing"
                      : status.linkedinProfileSynced
                        ? "Synced"
                        : "Connected"
                    : undefined
                }
                actions={
                  status.linkedinConnected ? (
                    <div className="flex gap-2">
                      {!status.linkedinTokenExpired && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={syncLinkedIn}
                          disabled={loading !== null}
                        >
                          {loading === "linkedin-sync" ? (
                            <Spinner />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Sync
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={disconnectLinkedIn}
                        disabled={loading !== null}
                      >
                        <Unplug className="h-3.5 w-3.5" />
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={connectLinkedIn} disabled={loading !== null}>
                      {loading === "linkedin-connect" && <Spinner className="h-3.5 w-3.5 text-[var(--btn-primary-fg)]" />}
                      Connect
                    </Button>
                  )
                }
              />

              <ConnectionRow
                icon={Mail}
                name="Gmail"
                description="Send outreach directly from your inbox"
                connected={status.gmailConnected}
                badge={status.gmailConnected ? "Connected" : undefined}
                actions={
                  status.gmailConnected ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={disconnectGmail}
                      disabled={loading !== null}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" onClick={connectGmail} disabled={loading !== null}>
                      {loading === "gmail-connect" && <Spinner className="h-3.5 w-3.5 text-[var(--btn-primary-fg)]" />}
                      Connect
                    </Button>
                  )
                }
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium text-foreground">WhatsApp</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Chat with Outpitch from your phone.
            </p>

            <div className="mt-4 rounded-xl border border-border bg-bg-elevated p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-surface">
                  <MessageCircle className="h-5 w-5 text-foreground" aria-hidden />
                </div>
                <div className="flex-1">
                  {status.whatsappVerified && (
                    <Badge className="mb-2">{status.whatsappNumber ?? "Verified"}</Badge>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      type="tel"
                      value={whatsappInput}
                      onChange={(e) => setWhatsappInput(e.target.value)}
                      placeholder="+1 555 123 4567"
                      className="flex-1"
                    />
                    <Button
                      size="md"
                      onClick={linkWhatsApp}
                      disabled={loading !== null || !whatsappInput.trim()}
                    >
                      {loading === "whatsapp-link" && <Spinner className="h-3.5 w-3.5 text-[var(--btn-primary-fg)]" />}
                      {status.whatsappVerified ? "Re-link" : "Link"}
                    </Button>
                  </div>
                  {whatsappCode && !status.whatsappVerified && (
                    <p className="mt-3 text-sm text-text-secondary">
                      Text this code to finish linking:{" "}
                      <strong className="text-foreground tracking-widest">{whatsappCode}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium text-foreground">Cognee memory</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Your profile, research, and conversations stored as a knowledge graph.
            </p>

            <div className="mt-4 rounded-xl border border-border bg-bg-elevated p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-surface">
                  <Brain className="h-5 w-5 text-foreground" aria-hidden />
                </div>
                <ul className="space-y-2 text-sm text-text-secondary">
                  {[
                    "Profile and preferences",
                    "Company research",
                    "Conversation history",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-foreground" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
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
  badge,
  actions,
}: {
  icon: typeof Linkedin;
  name: string;
  description: string;
  connected: boolean;
  badge?: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-elevated p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
            connected ? "border-foreground bg-bg-surface" : "border-border bg-bg-base"
          }`}
        >
          <Icon className="h-5 w-5 text-foreground" aria-hidden />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">{name}</h3>
            {badge && <Badge variant="outline">{badge}</Badge>}
          </div>
          <p className="mt-1 text-sm text-text-secondary text-pretty">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{actions}</div>
    </div>
  );
}
