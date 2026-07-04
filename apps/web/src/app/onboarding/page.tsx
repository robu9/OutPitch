"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, CheckCircle2, Linkedin, Mail, Target, Terminal, Cpu, ShieldCheck } from "lucide-react";

const steps = [
  { id: 1, label: "01 // OAUTH CONNECT" },
  { id: 2, label: "02 // SEARCH SPECIFICATIONS" },
  { id: 3, label: "03 // DEPLOY WORKSTATION" },
];

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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#3b82f6] selection:text-white">
      {/* Monospaced Terminal Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#1f1f1f] bg-[#050505]/90 backdrop-blur px-6 font-mono text-xs">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[#888888]">SYS: <strong className="text-white">INITIALIZING WORKSTATION</strong></span>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 py-16">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#080808] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="dot-grid absolute inset-0 opacity-20 pointer-events-none" aria-hidden />

          {/* Terminal Title Bar */}
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 mb-8 text-xs font-mono text-[#888888]">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#3b82f6]" />
              <span>outpitch-init --config</span>
            </div>
            <Badge variant="primary">STEP {step} OF 3</Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Configure your workstation.
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#888888] font-mono leading-relaxed text-pretty">
            Connect your Composio OAuth accounts and define your target engineering roles. Stored in Cognee for compounding intelligence.
          </p>

          {/* Progress Indicator */}
          <div className="mt-8 grid grid-cols-3 gap-2 font-mono text-[10px] text-[#888888]">
            {steps.map((s) => (
              <div key={s.id} className="space-y-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s.id ? "bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-[#1f1f1f]"
                  }`}
                />
                <div className={step >= s.id ? "text-white font-bold" : ""}>{s.label}</div>
              </div>
            ))}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded border border-[#ef4444]/40 bg-[#ef4444]/10 p-3 text-xs font-mono text-[#ef4444]"
            >
              [SYSTEM ERROR]: {error}
            </div>
          )}

          {/* STEP 1: OAUTH CONNECT */}
          {step === 1 && (
            <div className="mt-8 space-y-4">
              <div className="text-xs font-mono text-[#888888] mb-2">
                SELECT ACCOUNTS TO CONNECT VIA COMPOSIO:
              </div>

              <button
                type="button"
                onClick={connectLinkedIn}
                disabled={loading}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all duration-150 ${
                  linkedinConnected
                    ? "border-[#10b981] bg-[#10b981]/10 text-white"
                    : "border-[#1f1f1f] bg-[#111111] hover:border-[#2a2a2a] text-[#888888] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-[#0c0c0c] text-white">
                    <Linkedin className="h-5 w-5 text-[#3b82f6]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">LinkedIn Graph</div>
                    <div className="text-xs font-mono text-[#888888]">
                      {linkedinConnected ? "OAuth Verified & Connected" : "Sync career experience & seniority"}
                    </div>
                  </div>
                </div>
                {linkedinConnected && <CheckCircle2 className="h-5 w-5 text-[#10b981]" />}
              </button>

              <button
                type="button"
                onClick={connectGmail}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all duration-150 ${
                  gmailConnected
                    ? "border-[#10b981] bg-[#10b981]/10 text-white"
                    : "border-[#1f1f1f] bg-[#111111] hover:border-[#2a2a2a] text-[#888888] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-[#0c0c0c] text-white">
                    <Mail className="h-5 w-5 text-[#10b981]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Google Workspace / Gmail</div>
                    <div className="text-xs font-mono text-[#888888]">
                      {gmailConnected ? "OAuth Verified & Connected" : "Enable direct inbox dispatch"}
                    </div>
                  </div>
                </div>
                {gmailConnected && <CheckCircle2 className="h-5 w-5 text-[#10b981]" />}
              </button>

              <div className="pt-4">
                <Button
                  className="w-full h-11 text-xs font-mono bg-white text-black hover:bg-[#e0e0e0] font-bold"
                  size="lg"
                  onClick={() => setStep(2)}
                >
                  Proceed to Specifications
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: GOALS & SPECIFICATIONS */}
          {step === 2 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (form.targetRole) setStep(3);
              }}
              className="mt-8 space-y-5 font-mono text-xs"
            >
              <div className="space-y-1.5">
                <label htmlFor="targetRole" className="text-white font-bold block">
                  TARGET ROLE // SENIORITY <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  id="targetRole"
                  required
                  value={form.targetRole}
                  onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                  placeholder="e.g. Staff Frontend Engineer / Tech Lead"
                  className="w-full h-11 rounded border border-[#2a2a2a] bg-[#111111] px-3.5 text-white placeholder:text-[#888888] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="targetLocation" className="text-white font-bold block">
                  TARGET LOCATION // REMOTE PREFERENCE
                </label>
                <input
                  id="targetLocation"
                  value={form.targetLocation}
                  onChange={(e) => setForm({ ...form, targetLocation: e.target.value })}
                  placeholder="e.g. San Francisco, CA / Remote US"
                  className="w-full h-11 rounded border border-[#2a2a2a] bg-[#111111] px-3.5 text-white placeholder:text-[#888888] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="targetIndustries" className="text-white font-bold block">
                  TARGET SECTORS // TECH STACK (COMMA SEPARATED)
                </label>
                <input
                  id="targetIndustries"
                  value={form.targetIndustries}
                  onChange={(e) => setForm({ ...form, targetIndustries: e.target.value })}
                  placeholder="e.g. Generative AI, Developer Tools, Rust, Next.js"
                  className="w-full h-11 rounded border border-[#2a2a2a] bg-[#111111] px-3.5 text-white placeholder:text-[#888888] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="summary" className="text-white font-bold block">
                  TECHNICAL SUMMARY // BACKGROUND NARRATIVE
                </label>
                <textarea
                  id="summary"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="Brief summary of your architectural achievements, latency optimizations, or leadership experience..."
                  rows={4}
                  className="w-full rounded border border-[#2a2a2a] bg-[#111111] p-3.5 text-white placeholder:text-[#888888] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" className="h-11 px-6 font-mono" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 font-mono bg-white text-black hover:bg-[#e0e0e0] font-bold"
                  disabled={!form.targetRole}
                >
                  Confirm Specifications
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: LAUNCH CONFIRMATION */}
          {step === 3 && (
            <div className="mt-8 space-y-6 font-mono text-xs">
              <div className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Cpu className="h-4 w-4 text-[#3b82f6]" />
                    <span>COGNEE GRAPH INITIALIZED</span>
                  </div>
                  <Badge variant="success">READY FOR DEPLOYMENT</Badge>
                </div>

                <p className="text-[#888888] leading-relaxed font-sans">
                  Your search parameters have been compiled into a persistent Cognee knowledge graph. Outpitch will now begin scanning Serper hiring indexes and extracting decision-maker emails via Apollo.
                </p>

                <div className="rounded border border-[#1f1f1f] bg-[#080808] p-4 space-y-2 text-[#d4d4d4]">
                  <div className="flex justify-between">
                    <span className="text-[#888888]">TARGET ROLE:</span>
                    <span className="text-white font-bold">{form.targetRole}</span>
                  </div>
                  {form.targetLocation && (
                    <div className="flex justify-between">
                      <span className="text-[#888888]">LOCATION:</span>
                      <span className="text-white font-bold">{form.targetLocation}</span>
                    </div>
                  )}
                  {form.targetIndustries && (
                    <div className="flex justify-between">
                      <span className="text-[#888888]">SECTORS:</span>
                      <span className="text-white font-bold">{form.targetIndustries}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="h-11 px-6 font-mono" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="flex-1 h-11 font-mono bg-white text-black hover:bg-[#e0e0e0] font-bold text-xs"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner className="h-4 w-4 text-black" />
                  ) : (
                    <>
                      Deploy Workstation
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
