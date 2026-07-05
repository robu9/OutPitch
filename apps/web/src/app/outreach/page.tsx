"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch, sendOutreachEmail } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { Clock, Mail, MessageSquare, Reply, Send } from "lucide-react";

interface Campaign {
  id: string;
  companyId?: string | null;
  subject?: string;
  body?: string;
  status: string;
  sentAt?: string;
  company: { name: string };
  contact?: { name: string; email?: string };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadCampaigns = useCallback(async () => {
    if (!user) return;
    const data = await apiFetch<{ campaigns: Campaign[] }>("/api/outreach", {
      clerkUserId: user.id,
    }).catch(() => ({ campaigns: [] as Campaign[] }));
    setCampaigns(data.campaigns);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadCampaigns().finally(() => setLoading(false));
  }, [user, loadCampaigns]);

  const sendableDrafts = campaigns.filter(
    (c) =>
      c.status === "draft" &&
      isValidEmail(c.contact?.email ?? "") &&
      Boolean(c.subject?.trim()) &&
      Boolean(c.body?.trim())
  );

  async function sendCampaign(campaign: Campaign, trackSending = true) {
    if (!user) return false;
    const to = campaign.contact?.email;
    const subject = campaign.subject?.trim();
    const body = campaign.body?.trim();
    if (!to || !isValidEmail(to) || !subject || !body) return false;

    if (trackSending) setSendingId(campaign.id);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[campaign.id];
      return next;
    });

    try {
      await sendOutreachEmail(user.id, {
        to,
        subject,
        body,
        campaignId: campaign.id,
        companyId: campaign.companyId ?? undefined,
      });
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaign.id
            ? { ...c, status: "sent", sentAt: new Date().toISOString() }
            : c
        )
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send";
      setErrors((prev) => ({ ...prev, [campaign.id]: message }));
      return false;
    } finally {
      if (trackSending) setSendingId(null);
    }
  }

  async function sendAllDrafts() {
    if (!user || sendableDrafts.length === 0) return;
    setSendingAll(true);
    for (const campaign of sendableDrafts) {
      await sendCampaign(campaign, false);
    }
    setSendingAll(false);
  }

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
                <strong className="text-foreground">{sent}</strong> sent
              </span>
              <span>
                <strong className="text-foreground">{replied}</strong> replies
              </span>
              <span>
                <strong className="text-foreground">{replyRate}%</strong> reply rate
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
              {sendableDrafts.length > 1 && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-5 py-3">
                  <p className="text-sm text-text-secondary">
                    {sendableDrafts.length} drafts ready to send
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={sendingAll || sendingId !== null}
                    onClick={sendAllDrafts}
                  >
                    {sendingAll ? (
                      <>
                        <Spinner className="h-3.5 w-3.5" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Send all drafts
                      </>
                    )}
                  </Button>
                </div>
              )}

              {campaigns.map((campaign) => {
                const config = statusConfig[campaign.status] ?? statusConfig.pending;
                const StatusIcon = config.icon;
                const isDraft = campaign.status === "draft";
                const to = campaign.contact?.email ?? "";
                const canSend =
                  isDraft &&
                  isValidEmail(to) &&
                  Boolean(campaign.subject?.trim()) &&
                  Boolean(campaign.body?.trim());
                const sending = sendingId === campaign.id || sendingAll;
                const error = errors[campaign.id];

                return (
                  <article
                    key={campaign.id}
                    className="rounded-xl border border-border bg-bg-elevated p-5 transition-colors hover:border-border-strong"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusIcon className="h-4 w-4 text-text-secondary" aria-hidden />
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {isDraft && !canSend && (
                        <Badge variant="outline">Missing contact email</Badge>
                      )}
                      {campaign.sentAt && (
                        <span className="text-xs text-text-secondary">
                          {new Date(campaign.sentAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-medium text-foreground">
                      {campaign.subject ?? "No subject"}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {campaign.contact?.name ?? "Hiring team"} at {campaign.company.name}
                      {campaign.contact?.email && ` · ${campaign.contact.email}`}
                    </p>
                    {campaign.body && (
                      <p className="mt-3 text-sm text-text-secondary whitespace-pre-wrap text-pretty">
                        {campaign.body}
                      </p>
                    )}
                    {error && (
                      <p className="mt-3 text-xs text-red-500">
                        {error.includes("Gmail not connected") ? (
                          <>
                            Connect Gmail in{" "}
                            <Link href="/settings" className="underline">
                              settings
                            </Link>{" "}
                            to send.
                          </>
                        ) : (
                          error
                        )}
                      </p>
                    )}
                    {canSend && (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-4"
                        disabled={sending}
                        onClick={() => sendCampaign(campaign)}
                      >
                        {sending ? (
                          <>
                            <Spinner className="h-3.5 w-3.5" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            Send email
                          </>
                        )}
                      </Button>
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
