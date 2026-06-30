"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/app-shell";
import { apiFetch } from "@/lib/api";
import { Building2, Mail, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

interface Company {
  id: string;
  name: string;
  domain: string;
  description?: string;
  matchScore: number;
  contacts: Array<{
    id: string;
    name: string;
    title?: string;
    email?: string;
    source: string;
    confidence: number;
  }>;
}

export default function CompaniesPage() {
  const { user } = useUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ companies: Company[] }>("/api/companies", {
      clerkUserId: user.id,
    })
      .then((data) => setCompanies(data.companies))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function sendFeedback(companyId: string, rating: "good" | "bad") {
    if (!user) return;
    await apiFetch(`/api/companies/${companyId}/feedback`, {
      method: "POST",
      clerkUserId: user.id,
      body: JSON.stringify({
        feedback: rating === "good" ? "Good match" : "Not a fit",
        rating,
      }),
    });
  }

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
        <h1 className="text-2xl font-bold mb-1">Discovered Companies</h1>
        <p className="text-muted-foreground mb-8">
          Companies found for your job search with contacts and match scores
        </p>

        {companies.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No companies yet. Ask the chat to find companies for your role.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {companies.map((company) => (
              <div
                key={company.id}
                className="p-5 border border-border rounded-xl bg-card"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{company.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {company.domain}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                      {company.matchScore}% match
                    </span>
                    <button
                      onClick={() => sendFeedback(company.id, "good")}
                      className="p-1.5 hover:bg-muted rounded-lg"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => sendFeedback(company.id, "bad")}
                      className="p-1.5 hover:bg-muted rounded-lg"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {company.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {company.description}
                  </p>
                )}

                {company.contacts?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Contacts
                    </p>
                    {company.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {contact.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {contact.email && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 bg-background rounded text-muted-foreground">
                            {contact.confidence}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
