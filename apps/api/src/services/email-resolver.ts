import { guessEmailPatterns } from "./crawler.js";

// Department inboxes (careers@, jobs@, etc.) are valid cold-outreach targets.
const DEPARTMENT_EMAIL_LOCALS = [
  "careers",
  "jobs",
  "job",
  "recruiting",
  "recruitment",
  "talent",
  "hr",
  "hiring",
  "people",
  "join",
  "workwithus",
  "work-with-us",
] as const;

function emailLocalPart(email: string): string {
  return email.split("@")[0]?.toLowerCase() ?? "";
}

function matchesDepartmentLocal(local: string, dept: string): boolean {
  return (
    local === dept ||
    local.startsWith(`${dept}.`) ||
    local.startsWith(`${dept}-`) ||
    local.startsWith(`${dept}_`)
  );
}

export function isDepartmentEmail(email: string): boolean {
  const local = emailLocalPart(email);
  return DEPARTMENT_EMAIL_LOCALS.some((dept) => matchesDepartmentLocal(local, dept));
}

export function pickDepartmentEmail(
  emails: string[]
): { email: string; title: string } | null {
  const unique = [...new Set(emails.map((e) => e.toLowerCase()))];
  const priority: Array<{ local: string; title: string }> = [
    { local: "careers", title: "Careers" },
    { local: "jobs", title: "Jobs" },
    { local: "job", title: "Jobs" },
    { local: "recruiting", title: "Recruiting" },
    { local: "recruitment", title: "Recruiting" },
    { local: "talent", title: "Talent" },
    { local: "hr", title: "HR" },
    { local: "hiring", title: "Hiring" },
    { local: "people", title: "People" },
    { local: "join", title: "Careers" },
    { local: "workwithus", title: "Careers" },
    { local: "work-with-us", title: "Careers" },
  ];

  for (const { local, title } of priority) {
    const match = unique.find((email) => matchesDepartmentLocal(emailLocalPart(email), local));
    if (match) return { email: match, title };
  }

  return null;
}

function personalCrawledEmails(crawledEmails: string[]): string[] {
  return crawledEmails.filter((email) => !isDepartmentEmail(email));
}

export async function resolveEmail(params: {
  name: string;
  domain: string;
  crawledEmails: string[];
  title?: string;
  linkedinUrl?: string;
}): Promise<{ email: string; source: string; confidence: number } | null> {
  const nameParts = params.name.split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");
  const personalEmails = personalCrawledEmails(params.crawledEmails);

  for (const email of personalEmails) {
    const local = emailLocalPart(email);
    if (
      local.includes(firstName.toLowerCase()) ||
      local.includes(lastName.toLowerCase().replace(" ", ""))
    ) {
      return { email, source: "crawl", confidence: 90 };
    }
  }

  if (personalEmails.length > 0) {
    const patterns = guessEmailPatterns(
      firstName,
      lastName,
      params.domain,
      personalEmails
    );
    if (patterns[0]) {
      return { email: patterns[0], source: "pattern", confidence: 60 };
    }
  }

  const patterns = guessEmailPatterns(firstName, lastName, params.domain);
  if (patterns.length > 0) {
    return { email: patterns[0], source: "pattern", confidence: 40 };
  }

  return null;
}
