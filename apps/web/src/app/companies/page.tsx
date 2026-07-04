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
  Terminal,
  Database,
  CheckCircle2,
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

  function scoreVariant(score: number): "success" | "primary" | "warning" | "muted" {
    if (score >= 80) return "success";
    if (score >= 60) return "primary";
    if (score >= 40) return "warning";
    return "muted";
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
        title="Discovered Pipeline"
        description={
          companies.length > 0
            ? `${companies.length} active targets identified · ranked by Cognee neural match score`
            : "Active hiring signals discovered by Serper and enriched via Apollo"
        }
        meta="PIPELINE // ACTIVE — SERPER + APOLLO ENRICHED"
        action={
          companies.length > 0 ? (
            <div className="flex items-center gap-4 text-xs font-mono text-[#888888] bg-[#111111] px-3 py-1.5 rounded border border-[#1f1f1f]">
              <span>TOTAL TARGETS: <strong className="text-white">{companies.length}</strong></span>
              <span>•</span>
              <span>ENRICHED EMAILS: <strong className="text-[#10b981]">{companies.reduce((acc, c) => acc + c.contacts.length, 0)}</strong></span>
            </div>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto bg-[#050505]">
        <div className="mx-auto max-w-5xl px-5 py-8">
          {companies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Pipeline empty // no targets discovered"
              description="Execute a discovery command in the Workstation chat (e.g. 'outpitch discover --role Senior Frontend'). Outpitch will scan Serper hiring signals and enrich decision-maker emails automatically."
              action={
                <Link href="/chat">
                  <Button variant="terminal" size="md" className="h-9 px-4 text-xs font-mono bg-[#161616] text-white hover:bg-[#2a2a2a]">
                    <Terminal className="h-3.5 w-3.5 text-accent mr-1" />
                    Launch Discovery Command
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="rounded-xl border border-[#2a2a2a] bg-[#080808] overflow-hidden shadow-2xl">
              {/* Table Header */}
              <div className="grid grid-cols-12 border-b border-[#1f1f1f] bg-[#0d0d0d] px-5 py-3 text-xs font-mono font-bold text-[#888888]">
                <div className="col-span-5">COMPANY &amp; HIRING SIGNAL</div>
                <div className="col-span-3">COGNEE MATCH SCORE</div>
                <div className="col-span-2">DECISION MAKERS</div>
                <div className="col-span-2 text-right">COGNEE FEEDBACK</div>
              </div>

              <div className="divide-y divide-[#1f1f1f]">
                {companies.map((company) => {
                  const isOpen = expanded[company.id];
                  const hasContacts = company.contacts?.length > 0;

                  return (
                    <article key={company.id} className="transition-colors hover:bg-[#0c0c0c]">
                      <div className="grid grid-cols-12 items-center px-5 py-4 gap-4">
                        {/* Company & Domain */}
                        <div className="col-span-5 flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              hasContacts &&
                              setExpanded((prev) => ({
                                ...prev,
                                [company.id]: !prev[company.id],
                              }))
                            }
                            className={`mt-1 shrink-0 text-[#888888] ${hasContacts ? "hover:text-white" : "invisible"}`}
                            aria-expanded={isOpen}
                            aria-label={isOpen ? "Collapse decision makers" : "Expand decision makers"}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 text-accent" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white truncate">{company.name}</span>
                              <a
                                href={`https://${company.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-mono text-[#888888] hover:text-accent transition-colors"
                              >
                                {company.domain}
                                <ExternalLink className="h-3 w-3" aria-hidden />
                              </a>
                            </div>
                            {company.description && (
                              <p className="mt-1 text-xs text-[#888888] line-clamp-1 font-mono text-pretty">
                                {company.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Cognee Match Score */}
                        <div className="col-span-3 flex items-center gap-2">
                          <Badge variant={scoreVariant(company.matchScore)}>
                            {company.matchScore}% FIT
                          </Badge>
                          <span className="text-[11px] font-mono text-[#888888] hidden md:inline">NEURAL GRAPH</span>
                        </div>

                        {/* Contacts Count */}
                        <div className="col-span-2 font-mono text-xs">
                          {hasContacts ? (
                            <span className="text-white font-medium flex items-center gap-1.5">
                              <Database className="h-3.5 w-3.5 text-accent" />
                              {company.contacts.length} Enriched
                            </span>
                          ) : (
                            <span className="text-[#888888]">Pending Crawl</span>
                          )}
                        </div>

                        {/* Cognee Feedback Loop Buttons */}
                        <div className="col-span-2 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => sendFeedback(company.id, "good")}
                            title="Good fit (Instructs Cognee to prioritize similar tech stacks)"
                            className={`flex h-8 px-2.5 items-center gap-1.5 rounded text-xs font-mono transition-all duration-150 border ${
                              feedbackSent[company.id] === "good"
                                ? "bg-[#10b981]/20 border-[#10b981] text-[#10b981] font-bold"
                                : "border-[#1f1f1f] bg-[#111111] text-[#888888] hover:border-[#2a2a2a] hover:text-white"
                            }`}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Good Fit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => sendFeedback(company.id, "bad")}
                            title="Not a fit (Instructs Cognee to filter out similar companies)"
                            className={`flex h-8 px-2.5 items-center gap-1.5 rounded text-xs font-mono transition-all duration-150 border ${
                              feedbackSent[company.id] === "bad"
                                ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] font-bold"
                                : "border-[#1f1f1f] bg-[#111111] text-[#888888] hover:border-[#2a2a2a] hover:text-white"
                            }`}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Exclude</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable Enriched Decision Makers Drawer */}
                      {isOpen && hasContacts && (
                        <div className="border-t border-[#1f1f1f] bg-[#0a0a0a] px-5 py-4 pl-14 animate-fade-in">
                          <div className="text-xs font-mono text-[#888888] uppercase tracking-wider mb-3 flex items-center justify-between">
                            <span>VERIFIED DECISION MAKERS ({company.contacts.length}):</span>
                            <span className="text-[#10b981]">APOLLO.IO + FIRECRAWL EXTRACTED</span>
                          </div>
                          <ul className="space-y-2.5">
                            {company.contacts.map((contact) => (
                              <li
                                key={contact.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between rounded border border-[#1f1f1f] bg-[#111111] p-3 font-mono text-xs gap-2"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-7 w-7 rounded bg-[#1f1f1f] flex items-center justify-center text-white font-bold">
                                    {contact.name[0]}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-white">{contact.name}</span>
                                    {contact.title && (
                                      <span className="text-[#888888]"> — {contact.title}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  {contact.email && (
                                    <span className="inline-flex items-center gap-1.5 text-accent">
                                      <Mail className="h-3.5 w-3.5" aria-hidden />
                                      {contact.email}
                                    </span>
                                  )}
                                  <Badge variant="primary">{contact.confidence}% Verified</Badge>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
