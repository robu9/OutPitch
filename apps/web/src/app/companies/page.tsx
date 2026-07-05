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
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Mail,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

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
  const [feedbackSent, setFeedbackSent] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
    setFeedbackSent((prev) => ({ ...prev, [companyId]: rating }));
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
        <PageLoader />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Companies"
        description={
          companies.length > 0
            ? `${companies.length} companies in your pipeline`
            : "Discover companies through chat to build your pipeline"
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-5 py-8">
          {companies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No companies yet"
              description="Start a conversation in chat to discover companies in your target field."
              action={
                <Link href="/chat">
                  <Button>
                    <MessageSquare className="h-4 w-4" />
                    Go to chat
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {companies.map((company) => {
                const isOpen = expanded[company.id];
                const hasContacts = company.contacts?.length > 0;

                return (
                  <article
                    key={company.id}
                    className="rounded-xl border border-border bg-bg-elevated overflow-hidden transition-colors hover:border-border-strong"
                  >
                    <div className="flex items-start gap-4 p-5">
                      <button
                        type="button"
                        onClick={() =>
                          hasContacts &&
                          setExpanded((prev) => ({
                            ...prev,
                            [company.id]: !prev[company.id],
                          }))
                        }
                        className={`mt-1 shrink-0 text-text-secondary ${hasContacts ? "hover:text-foreground" : "invisible"}`}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium text-foreground">
                            {company.name}
                          </h3>
                          <a
                            href={`https://${company.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-foreground"
                          >
                            {company.domain}
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                          <Badge variant="outline">{company.matchScore}% match</Badge>
                        </div>
                        {company.description && (
                          <p className="mt-1 text-sm text-text-secondary line-clamp-2 text-pretty">
                            {company.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-text-secondary">
                          {hasContacts
                            ? `${company.contacts.length} contacts found`
                            : "Contacts pending"}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => sendFeedback(company.id, "good")}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                            feedbackSent[company.id] === "good"
                              ? "border-foreground bg-foreground text-background"
                              : "border-border text-text-secondary hover:text-foreground"
                          }`}
                          aria-label="Good match"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => sendFeedback(company.id, "bad")}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                            feedbackSent[company.id] === "bad"
                              ? "border-foreground bg-bg-surface text-foreground"
                              : "border-border text-text-secondary hover:text-foreground"
                          }`}
                          aria-label="Not a fit"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {isOpen && hasContacts && (
                      <div className="border-t border-border bg-bg-base px-5 py-4 pl-14">
                        <p className="mb-3 text-xs text-text-secondary">
                          Decision-makers
                        </p>
                        <ul className="space-y-2">
                          {company.contacts.map((contact) => (
                            <li
                              key={contact.id}
                              className="flex flex-col gap-1 rounded-lg border border-border bg-bg-elevated p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <span className="text-sm text-foreground">{contact.name}</span>
                                {contact.title && (
                                  <span className="text-sm text-text-secondary">
                                    {" "}
                                    · {contact.title}
                                  </span>
                                )}
                              </div>
                              {contact.email && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                                  <Mail className="h-3.5 w-3.5" aria-hidden />
                                  {contact.email}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
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
