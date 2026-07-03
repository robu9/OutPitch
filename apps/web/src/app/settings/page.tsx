"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/app-shell";
import { apiFetch } from "@/lib/api";
import { Mail, Linkedin, Loader2 } from "lucide-react";

type ConnectionStatus = {
  linkedinConnected: boolean;
  linkedinTokenExpired?: boolean;
  gmailConnected: boolean;
  linkedinProfileSynced?: boolean;
  linkedinSyncing?: boolean;
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

  const linkedinSyncing = loading === "linkedin-sync" || status.linkedinSyncing;

  return (
    <AppShell>
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground mb-8">
          Manage your connected accounts and preferences
        </p>

        {error && (
          <div className="mb-6 p-4 border border-destructive/40 bg-destructive/10 text-destructive rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 border border-border rounded-xl bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Linkedin className="w-5 h-5" />
              <div>
                <p className="font-medium">LinkedIn</p>
                <p className="text-sm text-muted-foreground">
                  {linkedinSyncing
                    ? "Syncing your profile…"
                    : status.linkedinTokenExpired
                      ? "Session expired — please reconnect"
                      : status.linkedinConnected
                        ? status.linkedinProfileSynced
                          ? "Connected — profile synced"
                          : "Connected — sync your profile"
                        : "Profile data for job matching"}
                </p>
              </div>
            </div>
            {status.linkedinConnected ? (
              <div className="flex items-center gap-2">
                {status.linkedinTokenExpired ? (
                  <button
                    onClick={() => { disconnectLinkedIn().then(() => connectLinkedIn()); }}
                    disabled={loading !== null}
                    className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {(loading === "linkedin-disconnect" || loading === "linkedin-connect") && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    Reconnect
                  </button>
                ) : (
                  <button
                    onClick={syncLinkedIn}
                    disabled={loading !== null}
                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-accent disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {loading === "linkedin-sync" && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {loading === "linkedin-sync" ? "Syncing…" : "Sync now"}
                  </button>
                )}
                <button
                  onClick={disconnectLinkedIn}
                  disabled={loading !== null}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading === "linkedin-disconnect" && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectLinkedIn}
                disabled={loading !== null}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-accent disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading === "linkedin-connect" && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Connect
              </button>
            )}
          </div>

          <div className="p-4 border border-border rounded-xl bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5" />
              <div>
                <p className="font-medium">Gmail</p>
                <p className="text-sm text-muted-foreground">
                  Send outreach emails via Composio
                </p>
              </div>
            </div>
            {status.gmailConnected ? (
              <button
                onClick={disconnectGmail}
                disabled={loading !== null}
                className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading === "gmail-disconnect" && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Disconnect
              </button>
            ) : (
              <button
                onClick={connectGmail}
                disabled={loading !== null}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-accent disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading === "gmail-connect" && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Connect
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 p-4 border border-border rounded-xl bg-card">
          <h3 className="font-medium mb-2">Context</h3>
          <p className="text-sm text-muted-foreground">
            Outpitch uses your profile, chat history, and company data to
            personalize recommendations and outreach drafts.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
