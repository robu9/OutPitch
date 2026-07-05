import { z } from "zod";

export const EmailSourceSchema = z.enum(["crawl", "pattern", "manual"]);
export type EmailSource = z.infer<typeof EmailSourceSchema>;

export const CampaignStatusSchema = z.enum([
  "draft",
  "pending_confirm",
  "sent",
  "replied",
  "bounced",
  "failed",
]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const PipelineJobStatusSchema = z.enum([
  "queued",
  "searching",
  "crawling",
  "enriching",
  "completed",
  "failed",
]);
export type PipelineJobStatus = z.infer<typeof PipelineJobStatusSchema>;

export const UserProfileSchema = z.object({
  headline: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).default([]),
  targetRole: z.string().optional(),
  targetLocation: z.string().optional(),
  targetIndustries: z.array(z.string()).default([]),
  experienceYears: z.number().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const CompanySearchParamsSchema = z.object({
  role: z.string(),
  location: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  limit: z.number().min(1).max(20).default(10),
});
export type CompanySearchParams = z.infer<typeof CompanySearchParamsSchema>;

export const ContactSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  email: z.string().email().optional(),
  linkedinUrl: z.string().url().optional(),
  source: EmailSourceSchema,
  confidence: z.number().min(0).max(100),
});
export type Contact = z.infer<typeof ContactSchema>;

export const CompanyResultSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  domain: z.string(),
  description: z.string().optional(),
  matchScore: z.number().min(0).max(100).optional(),
  contacts: z.array(ContactSchema).default([]),
  sourceUrl: z.string().optional(),
});
export type CompanyResult = z.infer<typeof CompanyResultSchema>;

export const EmailDraftSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  contactName: z.string().optional(),
  companyName: z.string().optional(),
});
export type EmailDraft = z.infer<typeof EmailDraftSchema>;

export const ChatMessageRoleSchema = z.enum(["user", "assistant", "system", "tool"]);
export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: ChatMessageRoleSchema,
  content: z.string(),
  toolName: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const OnboardingPayloadSchema = z.object({
  targetRole: z.string().min(1),
  targetLocation: z.string().optional(),
  targetIndustries: z.array(z.string()).default([]),
  summary: z.string().optional(),
});
export type OnboardingPayload = z.infer<typeof OnboardingPayloadSchema>;

export const SendEmailPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  campaignId: z.string().optional(),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
});
export type SendEmailPayload = z.infer<typeof SendEmailPayloadSchema>;

export const PipelineProgressSchema = z.object({
  jobId: z.string(),
  status: PipelineJobStatusSchema,
  progress: z.number().min(0).max(100),
  message: z.string().optional(),
  companies: z.array(CompanyResultSchema).optional(),
});
export type PipelineProgress = z.infer<typeof PipelineProgressSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
