"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/app-shell";
import { apiFetch } from "@/lib/api";
import { Mail, Linkedin, CheckCircle, XCircle } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();
  const [status, setStatus] = useState({
    linkedinConnected: false,
    gmailConnected: false,
    onboardingDone: false,
  });

  useEffect(() => {
    if (!user) return;
    apiFetch<typeof status>("/api/onboarding/status", {
      clerkUserId: user.id,
    }).then(setStatus).catch(() => {});
  }, [user]);

  async function connectGmail() {
    if (!user) return;
    const { url } = await apiFetch<{ url: string }>(
      "/api/onboarding/connect/gmail",
      { clerkUserId: user.id }
    );
    if (url) window.location.href = url;
  }

  return (
    <AppShell>
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground mb-8">
          Manage your connected accounts and preferences
        </p>

        <div className="space-y-4">
          <div className="p-4 border border-border rounded-xl bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Linkedin className="w-5 h-5" />
              <div>
                <p className="font-medium">LinkedIn</p>
                <p className="text-sm text-muted-foreground">
                  Profile data for job matching
                </p>
              </div>
            </div>
            {status.linkedinConnected ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-muted-foreground" />
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
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <button
                onClick={connectGmail}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-accent"
              >
                Connect
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 p-4 border border-border rounded-xl bg-card">
          <h3 className="font-medium mb-2">Memory</h3>
          <p className="text-sm text-muted-foreground">
            Outpitch uses Cognee to remember your preferences, company knowledge,
            and outreach history. Memory improves over time as you interact with
            the chat and provide feedback on company matches.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
