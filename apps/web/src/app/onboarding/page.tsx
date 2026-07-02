"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import { Loader2, Mail, Linkedin } from "lucide-react";

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [form, setForm] = useState({
    targetRole: "",
    targetLocation: "",
    targetIndustries: "",
    summary: "",
  });

  useEffect(() => {
    if (!user) return;
    apiFetch<{ linkedinConnected: boolean }>("/api/onboarding/status", {
      clerkUserId: user.id,
    })
      .then((status) => setLinkedinConnected(status.linkedinConnected))
      .catch(() => {});
  }, [user]);

  async function connectLinkedIn() {
    if (!user) return;
    setLoading(true);
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
      setLoading(false);
    }
  }

  async function connectGmail() {
    if (!user) return;
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
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await apiFetch("/api/onboarding/complete", {
        method: "POST",
        clerkUserId: user.id,
        body: JSON.stringify({
          targetRole: form.targetRole,
          targetLocation: form.targetLocation || undefined,
          targetIndustries: form.targetIndustries
            ? form.targetIndustries.split(",").map((s) => s.trim())
            : [],
          summary: form.summary || undefined,
        }),
      });
      router.push("/chat");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome to Outpitch</h1>
        <p className="text-muted-foreground mb-8">
          Connect your accounts and tell us about your job search goals.
        </p>

        {error && (
          <div className="mb-6 p-4 border border-destructive/40 bg-destructive/10 text-destructive rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 mb-8">
          <button
            onClick={connectLinkedIn}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            {linkedinConnected ? "LinkedIn connected" : "Connect LinkedIn"}
          </button>
          <button
            onClick={connectGmail}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Mail className="w-4 h-4" />
            Connect Gmail
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Target Role *
            </label>
            <input
              required
              value={form.targetRole}
              onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Location</label>
            <input
              value={form.targetLocation}
              onChange={(e) =>
                setForm({ ...form, targetLocation: e.target.value })
              }
              placeholder="e.g. San Francisco, Remote"
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Industries (comma-separated)
            </label>
            <input
              value={form.targetIndustries}
              onChange={(e) =>
                setForm({ ...form, targetIndustries: e.target.value })
              }
              placeholder="e.g. AI, SaaS, Fintech"
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              About you
            </label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Brief summary of your experience and what you're looking for..."
              rows={4}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.targetRole}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Start Job Search
          </button>
        </form>
      </div>
    </div>
  );
}
