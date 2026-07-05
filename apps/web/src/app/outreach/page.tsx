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
import { Clock, Mail, MessageSquare, Reply, Send } from "lucide-react";

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
  { label: string; variant: "default" | "primary" | "outline"; icon: typeof Send }
> = {
  sent: { label: "Sent", variant: "primary", icon: Send },
  replied: { label: "Replied", variant: "primary", icon: Reply },
  draft: { label: "Draft", variant: "outline", icon: Mail },
  pending: { label: "Pending", variant: "default", icon: Clock },
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
  const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(0) : "0";

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
        title="Outreach"
        description="Track drafts, sent emails, and replies"
        action={
          campaigns.length > 0 ? (
            <div className="flex gap-4 text-sm text-text-secondary">
              <span>
                <strong className="text-white">{sent}</strong> sent
              </span>
              <span>
                <strong className="text-white">{replied}</strong> replies
              </span>
              <span>
                <strong className="text-white">{replyRate}%</strong> reply rate
              </span>
            </div>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-5 py-8">
          {campaigns.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No outreach yet"
              description="Draft and send personalized emails through chat."
              action={
                <Link href="/chat">
                  <Button>
                    <MessageSquare className="h-4 w-4" />
                    Draft in chat
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const config = statusConfig[campaign.status] ?? statusConfig.pending;
                const StatusIcon = config.icon;

                return (
                  <article
                    key={campaign.id}
                    className="rounded-xl border border-border bg-bg-elevated p-5 transition-colors hover:border-border-strong"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusIcon className="h-4 w-4 text-text-secondary" aria-hidden />
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {campaign.sentAt && (
                        <span className="text-xs text-text-secondary">
                          {new Date(campaign.sentAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-medium text-white">
                      {campaign.subject ?? "No subject"}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {campaign.contact?.name ?? "Hiring team"} at {campaign.company.name}
                      {campaign.contact?.email && ` · ${campaign.contact.email}`}
                    </p>
                    {campaign.body && (
                      <p className="mt-3 text-sm text-text-secondary line-clamp-2 text-pretty">
                        {campaign.body}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
