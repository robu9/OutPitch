import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import { buildLinkedInProfileSummary } from "./linkedin-profile.js";

export interface DraftEmailInput {
  senderName: string;
  senderProfile: string;
  contactName: string;
  contactTitle?: string;
  contactEmail?: string;
  companyName: string;
  companyDescription?: string;
  companyIndustry?: string;
  purpose: string;
  memorySnippets?: string[];
}

export interface DraftEmailResult {
  to: string;
  subject: string;
  body: string;
}

const AI_TELLS = [
  /\bI hope this (?:email )?finds you well\.?\s*/gi,
  /\bI wanted to reach out\b/gi,
  /\bI am writing to\b/gi,
  /\bI'?m reaching out\b/gi,
  /\bI came across your\b/gi,
  /\bI was impressed by your work\b/gi,
  /\bI would love to (?:connect|chat|learn more)\b/gi,
  /\bLooking forward to hearing from you\b/gi,
  /\bPlease do not hesitate to\b/gi,
  /\bAt your earliest convenience\b/gi,
  /\bI believe I would be a (?:great|strong) (?:fit|addition)\b/gi,
  /\bpassionate about\b/gi,
  /\bexcited to (?:connect|share|discuss)\b/gi,
  /\bleverage\b/gi,
  /\bsynerg(?:y|ies)\b/gi,
  /\bdelve\b/gi,
  /\blandscape\b/gi,
  /\bthrilled\b/gi,
  /\bBest regards,?\s*/gi,
  /\bKind regards,?\s*/gi,
  /\bWarm regards,?\s*/gi,
];

/** Strip common AI giveaways and awkward punctuation from generated copy. */
export function humanizeEmailText(text: string): string {
  let out = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[*\-+]\s+/gm, "")
    .replace(/\u2014/g, ", ")
    .replace(/\u2013/g, "-")
    .replace(/—/g, ", ")
    .replace(/–/g, "-")
    .replace(/\s+,\s+/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  for (const pattern of AI_TELLS) {
    out = out.replace(pattern, "");
  }

  return out.replace(/  +/g, " ").trim();
}

function buildSenderBlock(input: DraftEmailInput): string {
  return input.senderProfile || `Name: ${input.senderName}`;
}

function buildRecipientBlock(input: DraftEmailInput): string {
  const lines = [
    `Name: ${input.contactName}`,
    input.contactTitle ? `Title: ${input.contactTitle}` : null,
    `Company: ${input.companyName}`,
    input.companyIndustry ? `Industry: ${input.companyIndustry}` : null,
    input.companyDescription ? `About company: ${input.companyDescription.slice(0, 600)}` : null,
    `Outreach goal: ${input.purpose}`,
  ].filter(Boolean);

  return lines.join("\n");
}

function fallbackDraft(input: DraftEmailInput): DraftEmailResult {
  const firstName = input.contactName.split(/\s+/)[0] ?? input.contactName;
  const role = input.senderProfile.match(/Target role: ([^|]+)/)?.[1]?.trim();

  return {
    to: input.contactEmail ?? "[contact email]",
    subject: `${input.companyName} / ${input.purpose}`,
    body: humanizeEmailText(
      `Hi ${firstName},\n\n` +
        `I saw what ${input.companyName} is doing in ${input.companyIndustry ?? "your space"} and thought it might be worth a quick note. ` +
        `I'm ${input.senderName}${role ? `, focused on ${role}` : ""}. ` +
        `${input.purpose.charAt(0).toUpperCase() + input.purpose.slice(1)}.\n\n` +
        `Open to a short call this week if you have 15 minutes?\n\n` +
        `Thanks,\n${input.senderName.split(/\s+/)[0] ?? input.senderName}`
    ),
  };
}

export async function draftOutreachEmail(input: DraftEmailInput): Promise<DraftEmailResult> {
  if (!config.geminiApiKey) {
    return fallbackDraft(input);
  }

  const memoryBlock =
    input.memorySnippets && input.memorySnippets.length > 0
      ? `\nRelevant context from past notes:\n${input.memorySnippets.slice(0, 6).join("\n---\n")}`
      : "";

  const prompt = `Write a cold outreach email from a job seeker to a company contact.

Sender:
${buildSenderBlock(input)}

Recipient:
${buildRecipientBlock(input)}
${memoryBlock}

Rules (strict):
- Plain text only. No markdown, bullets, bold, or HTML.
- Under 130 words.
- Sound like a real person wrote it in 5 minutes, not an AI or a cover letter.
- Open with something specific to the company or their role, not a generic compliment.
- One clear, low-pressure ask (short call or reply).
- Use contractions sometimes (I'm, you're, it's).
- Vary sentence length. Short sentences are fine.
- Sign off with "Thanks," or "Best," plus the sender's first name only.
- NEVER use: em dashes, en dashes, "I hope this finds you well", "I wanted to reach out", "I am writing to", "passionate", "thrilled", "excited to connect", "leverage", "synergy", "landscape", "delve", "Best regards", "Kind regards".
- Do not use hyphens as clause separators mid-sentence. Use commas or periods instead.
- Subject line: short, specific, no clickbait, no ALL CAPS, no "Opportunity" or "Introduction" unless natural.

Return JSON only:
{"subject":"...","body":"..."}`;

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  try {
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as { subject?: string; body?: string };

    const subject = humanizeEmailText(parsed.subject ?? `${input.companyName}`);
    const body = humanizeEmailText(parsed.body ?? "");

    if (!body) return fallbackDraft(input);

    return {
      to: input.contactEmail ?? "[contact email]",
      subject,
      body,
    };
  } catch (error) {
    console.warn("[email-drafter] Gemini draft failed:", error);
    return fallbackDraft(input);
  }
}

export function buildSenderProfileSummary(
  user: { name: string | null } | null,
  profile: {
    headline?: string | null;
    summary?: string | null;
    targetRole?: string | null;
    targetLocation?: string | null;
    targetIndustries?: string[];
    skills?: string[];
    linkedinData?: unknown;
  } | null | undefined
): string {
  const parts: string[] = [];
  if (user?.name) parts.push(`Name: ${user.name}`);
  if (profile?.headline) parts.push(`Headline: ${profile.headline}`);
  if (profile?.targetRole) parts.push(`Target role: ${profile.targetRole}`);
  if (profile?.targetLocation) parts.push(`Target location: ${profile.targetLocation}`);
  if (profile?.targetIndustries?.length) {
    parts.push(`Target industries: ${profile.targetIndustries.join(", ")}`);
  }
  if (profile?.skills?.length) parts.push(`Skills: ${profile.skills.slice(0, 12).join(", ")}`);
  if (profile?.summary) parts.push(`Summary: ${profile.summary}`);
  if (profile?.linkedinData) {
    parts.push(buildLinkedInProfileSummary(profile.linkedinData as Record<string, unknown>));
  }
  return parts.join("\n");
}
