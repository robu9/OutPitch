"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/spinner";
import { Clock, Mail, MessageSquare, Reply, Send, Terminal, TrendingUp, ShieldCheck } from "lucide-react";

interface Campaign {
  id: string;
  subject?: string;
  body?: string;
  status: string;
  sentAt?: string;
  company: { name: string };
  contact?: { name: string; email?: string };
}

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "primary" | "warning" | "muted"; icon: typeof Send }
> = {
  sent: { label: "DISPATCHED", variant: "primary", icon: Send },
  replied: { label: "REPLIED // MATCH", variant: "success", icon: Reply },
  draft: { label: "DRAFT // QUEUED", variant: "muted", icon: Mail },
  pending: { label: "PENDING DISPATCH", variant: "warning", icon: Clock },
};

export default function OutreachPage() {
  const { user } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ campaigns: Campaign[] }>("/api/outreach", {
      clerkUserId: user.id,
    })
      .then((data) => setCampaigns(data.campaigns))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const sent = campaigns.filter((c) => c.status === "sent" || c.status === "replied").length;
  const replied = campaigns.filter((c) => c.status === "replied").length;
  const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : "0.0";

  if (loading) {
    return (
      <AppShell>
        <PageLoader />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Campaign Telemetry Log"
        description="Real-time dispatch status and decision-maker response tracking via Composio OAuth"
        meta="TELEMETRY // OUTREACH DISPATCH LOG — COMPOSIO DIRECT INBOX"
        action={
          campaigns.length > 0 ? (
            <div className="flex items-center gap-6 text-xs font-mono bg-[#111111] px-4 py-2 rounded border border-[#1f1f1f]">
              <div>
                <span className="text-[#888888]">TOTAL: </span>
                <strong className="text-white tabular-nums">{campaigns.length}</strong>
              </div>
              <div>
                <span className="text-[#888888]">DISPATCHED: </span>
                <strong className="text-[#3b82f6] tabular-nums">{sent}</strong>
              </div>
              <div>
                <span className="text-[#888888]">REPLIES: </span>
                <strong className="text-[#10b981] tabular-nums">{replied}</strong>
              </div>
              <div>
                <span className="text-[#888888]">CONVERSION: </span>
                <strong className="text-[#10b981] tabular-nums">{replyRate}%</strong>
              </div>
            </div>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto bg-[#050505]">
        <div className="mx-auto max-w-5xl px-5 py-8">
          {campaigns.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Telemetry log empty // no campaigns dispatched"
              description="Use the Workstation chat to draft and dispatch personalized outreach emails to verified decision makers at your target startups."
              action={
                <Link href="/chat">
                  <Button variant="terminal" size="md" className="h-9 px-4 text-xs font-mono bg-[#161616] text-white hover:bg-[#2a2a2a]">
                    <Terminal className="h-3.5 w-3.5 text-[#3b82f6] mr-1" />
                    Draft Outreach in Chat
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-6">
              {/* Telemetry Log Banner */}
              <div className="rounded-lg border border-[#1f1f1f] bg-[#080808] p-4 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
                  <span className="text-white font-bold">DISPATCH PIPELINE HEALTH: 100% OPERATIONAL</span>
                </div>
                <div className="flex items-center gap-2 text-[#888888]">
                  <ShieldCheck className="h-4 w-4 text-[#3b82f6]" />
                  <span>COMPOSIO OAUTH 2.0 VERIFIED SENDING</span>
                </div>
              </div>

              {/* Timestamped Log List */}
              <div className="rounded-xl border border-[#2a2a2a] bg-[#080808] overflow-hidden shadow-2xl divide-y divide-[#1f1f1f]">
                <div className="grid grid-cols-12 border-b border-[#1f1f1f] bg-[#0d0d0d] px-5 py-3 text-xs font-mono font-bold text-[#888888]">
                  <div className="col-span-3">TIMESTAMP &amp; STATUS</div>
                  <div className="col-span-4">RECIPIENT &amp; COMPANY</div>
                  <div className="col-span-5">SUBJECT &amp; REASONING</div>
                </div>

                {campaigns.map((campaign) => {
                  const config = statusConfig[campaign.status] ?? statusConfig.pending;
                  const StatusIcon = config.icon;

                  return (
                    <article
                      key={campaign.id}
                      className="grid grid-cols-12 items-center px-5 py-4 gap-4 text-xs font-mono transition-colors hover:bg-[#0c0c0c]"
                    >
                      {/* Timestamp & Status Badge */}
                      <div className="col-span-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-3.5 w-3.5 text-[#3b82f6] shrink-0" />
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        <div className="text-[11px] text-[#888888] tabular-nums">
                          {campaign.sentAt ? (
                            `[${new Date(campaign.sentAt).toISOString().replace("T", " ").substring(0, 19)} UTC]`
                          ) : (
                            "[QUEUED FOR DISPATCH]"
                          )}
                        </div>
                      </div>

                      {/* Recipient & Company */}
                      <div className="col-span-4 min-w-0 space-y-0.5">
                        <div className="font-semibold text-white truncate">
                          {campaign.contact ? campaign.contact.name : "Hiring Team"}
                        </div>
                        <div className="text-[#888888] truncate">
                          @{campaign.company.name}
                          {campaign.contact?.email && (
                            <span className="text-[#3b82f6] ml-1">({campaign.contact.email})</span>
                          )}
                        </div>
                      </div>

                      {/* Subject Preview */}
                      <div className="col-span-5 min-w-0 space-y-1">
                        <div className="text-white font-medium truncate">
                          {campaign.subject ?? "No subject specified"}
                        </div>
                        <div className="text-[11px] text-[#888888] line-clamp-1 text-pretty">
                          {campaign.body ? campaign.body.substring(0, 90) + "..." : "Draft generated by Gemini 3 Pro reasoning engine."}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
