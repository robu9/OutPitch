"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/app-shell";
import { apiFetch } from "@/lib/api";
import { Mail, CheckCircle, Clock, Loader2 } from "lucide-react";

interface Campaign {
  id: string;
  subject?: string;
  body?: string;
  status: string;
  sentAt?: string;
  company: { name: string };
  contact?: { name: string; email?: string };
}

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

  const statusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "replied":
        return <Mail className="w-4 h-4 text-primary" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-1">Outreach</h1>
        <p className="text-muted-foreground mb-8">
          Track your sent emails and conversation status
        </p>

        {campaigns.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No outreach yet. Use chat to draft and send emails.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="p-4 border border-border rounded-xl bg-card"
              >
                <div className="flex items-center gap-3 mb-2">
                  {statusIcon(campaign.status)}
                  <div className="flex-1">
                    <p className="font-medium">{campaign.subject ?? "No subject"}</p>
                    <p className="text-sm text-muted-foreground">
                      {campaign.company.name}
                      {campaign.contact && ` → ${campaign.contact.name}`}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-muted rounded-full capitalize">
                    {campaign.status}
                  </span>
                </div>
                {campaign.sentAt && (
                  <p className="text-xs text-muted-foreground">
                    Sent {new Date(campaign.sentAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
