"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, CheckCircle2, Linkedin, Mail } from "lucide-react";

const steps = ["Connect", "Profile", "Launch"];

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [form, setForm] = useState({
    targetRole: "",
    targetLocation: "",
    targetIndustries: "",
    summary: "",
  });

  useEffect(() => {
    if (!user) return;
    apiFetch<{ linkedinConnected: boolean; gmailConnected: boolean }>(
      "/api/onboarding/status",
      { clerkUserId: user.id }
    )
      .then((status) => {
        setLinkedinConnected(status.linkedinConnected);
        setGmailConnected(status.gmailConnected);
      })
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
        setError("No OAuth URL returned.");
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
        setError("No OAuth URL returned.");
        return;
      }
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Gmail");
    }
  }

  async function handleSubmit() {
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
    <div className="min-h-screen bg-bg-base">
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <Logo size="sm" />
        <span className="text-xs text-text-secondary">
          Step {step} of 3
        </span>
      </header>

      <div className="mx-auto max-w-lg px-5 py-16">
        <div className="mb-8 flex gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1 rounded-full transition-colors ${
                  step > i ? "bg-white" : "bg-border"
                }`}
              />
              <p
                className={`mt-2 text-xs ${
                  step > i ? "text-white" : "text-text-secondary"
                }`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        <h1 className="text-2xl font-medium tracking-tight text-white">
          {step === 1 && "Connect your accounts"}
          {step === 2 && "Tell us what you're looking for"}
          {step === 3 && "You're ready to go"}
        </h1>
        <p className="mt-2 text-sm text-text-secondary text-pretty">
          {step === 1 &&
            "Link LinkedIn and Gmail to power discovery and outreach."}
          {step === 2 &&
            "We'll store this in Cognee so Outpitch remembers your preferences."}
          {step === 3 &&
            "Your profile is set. Start discovering companies in chat."}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-border bg-bg-elevated px-4 py-3 text-sm text-white"
          >
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={connectLinkedIn}
              disabled={loading}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                linkedinConnected
                  ? "border-white bg-bg-elevated"
                  : "border-border bg-bg-elevated hover:border-border-strong"
              }`}
            >
              <div className="flex items-center gap-3">
                <Linkedin className="h-5 w-5 text-white" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-white">LinkedIn</p>
                  <p className="text-xs text-text-secondary">
                    {linkedinConnected ? "Connected" : "Import your experience"}
                  </p>
                </div>
              </div>
              {linkedinConnected && (
                <CheckCircle2 className="h-5 w-5 text-white" aria-hidden />
              )}
            </button>

            <button
              type="button"
              onClick={connectGmail}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                gmailConnected
                  ? "border-white bg-bg-elevated"
                  : "border-border bg-bg-elevated hover:border-border-strong"
              }`}
            >
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-white" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-white">Gmail</p>
                  <p className="text-xs text-text-secondary">
                    {gmailConnected ? "Connected" : "Send outreach from your inbox"}
                  </p>
                </div>
              </div>
              {gmailConnected && (
                <CheckCircle2 className="h-5 w-5 text-white" aria-hidden />
              )}
            </button>

            <Button className="mt-4 w-full" size="lg" onClick={() => setStep(2)}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (form.targetRole) setStep(3);
            }}
            className="mt-8 space-y-4"
          >
            <div>
              <label htmlFor="targetRole" className="text-sm text-white">
                Target role <span className="text-text-secondary">*</span>
              </label>
              <Input
                id="targetRole"
                required
                value={form.targetRole}
                onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                placeholder="e.g. Staff Frontend Engineer"
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="targetLocation" className="text-sm text-white">
                Location preference
              </label>
              <Input
                id="targetLocation"
                value={form.targetLocation}
                onChange={(e) => setForm({ ...form, targetLocation: e.target.value })}
                placeholder="e.g. Remote US"
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="targetIndustries" className="text-sm text-white">
                Industries (comma-separated)
              </label>
              <Input
                id="targetIndustries"
                value={form.targetIndustries}
                onChange={(e) => setForm({ ...form, targetIndustries: e.target.value })}
                placeholder="e.g. Developer Tools, AI"
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="summary" className="text-sm text-white">
                Background summary
              </label>
              <textarea
                id="summary"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Brief summary of your experience..."
                rows={4}
                className="mt-1.5 w-full rounded-lg border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-white placeholder:text-text-secondary focus:border-border-strong focus:outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={!form.targetRole}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-border bg-bg-elevated p-5 text-sm">
              <div className="flex justify-between py-1.5">
                <span className="text-text-secondary">Role</span>
                <span className="text-white">{form.targetRole}</span>
              </div>
              {form.targetLocation && (
                <div className="flex justify-between py-1.5">
                  <span className="text-text-secondary">Location</span>
                  <span className="text-white">{form.targetLocation}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button className="flex-1" size="lg" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <Spinner className="h-4 w-4 text-[#050505]" />
                ) : (
                  <>
                    Open chat
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
