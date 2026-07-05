import type { SendEmailPayload } from "@outpitch/types";
import { prisma } from "@outpitch/db";
import { AppError } from "../middleware/error.js";
import { sendEmail } from "./composio.js";
import { remember, userDataset } from "./cognee.js";

const SENT_STATUSES = new Set(["sent", "replied"]);

export interface SendOutreachResult {
  success: true;
  campaignId: string;
  alreadySent?: boolean;
  result?: Record<string, unknown>;
}

export async function sendOutreachCampaign(
  userId: string,
  clerkId: string,
  input: SendEmailPayload,
  options?: { cogneeToken?: string }
): Promise<SendOutreachResult> {
  let payload = { ...input };

  if (payload.campaignId) {
    const existing = await prisma.outreachCampaign.findFirst({
      where: { id: payload.campaignId, userId },
      include: { company: true, contact: true },
    });

    if (!existing) {
      throw new AppError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");
    }

    if (SENT_STATUSES.has(existing.status)) {
      return { success: true, campaignId: existing.id, alreadySent: true };
    }

    if (existing.contact?.email) {
      payload.to = existing.contact.email;
    }
    if (!payload.companyId && existing.companyId) {
      payload.companyId = existing.companyId;
    }
    if (!payload.contactId && existing.contactId) {
      payload.contactId = existing.contactId;
    }

    const locked = await prisma.outreachCampaign.updateMany({
      where: { id: payload.campaignId, userId, status: "draft" },
      data: { status: "pending" },
    });

    if (locked.count === 0) {
      const current = await prisma.outreachCampaign.findFirst({
        where: { id: payload.campaignId, userId },
      });
      if (current && SENT_STATUSES.has(current.status)) {
        return { success: true, campaignId: current.id, alreadySent: true };
      }
      throw new AppError(409, "Campaign is already being sent", "CAMPAIGN_IN_FLIGHT");
    }
  } else if (payload.companyId) {
    const duplicate = await prisma.outreachCampaign.findFirst({
      where: {
        userId,
        companyId: payload.companyId,
        contact: { email: payload.to },
        status: { in: ["sent", "replied"] },
      },
      orderBy: { sentAt: "desc" },
    });
    if (duplicate) {
      return { success: true, campaignId: duplicate.id, alreadySent: true };
    }
  }

  let campaignId = payload.campaignId;

  try {
    const result = await sendEmail(clerkId, {
      to: payload.to,
      subject: payload.subject,
      body: payload.body,
    });

    const gmailMsgId =
      typeof result?.id === "string"
        ? result.id
        : typeof result?.message_id === "string"
          ? result.message_id
          : undefined;

    if (campaignId) {
      await prisma.outreachCampaign.update({
        where: { id: campaignId },
        data: {
          status: "sent",
          sentAt: new Date(),
          subject: payload.subject,
          body: payload.body,
          ...(gmailMsgId ? { gmailMsgId } : {}),
        },
      });
    } else {
      const campaign = await prisma.outreachCampaign.create({
        data: {
          user: { connect: { id: userId } },
          ...(payload.companyId
            ? { company: { connect: { id: payload.companyId } } }
            : {}),
          ...(payload.contactId
            ? { contact: { connect: { id: payload.contactId } } }
            : {}),
          subject: payload.subject,
          body: payload.body,
          status: "sent",
          sentAt: new Date(),
          ...(gmailMsgId ? { gmailMsgId } : {}),
        },
      });
      campaignId = campaign.id;
    }

    const companyLabel = payload.companyId ? ` for company ${payload.companyId}` : "";
    await remember(`Sent email to ${payload.to}${companyLabel}: "${payload.subject}"`, {
      dataset: userDataset(clerkId),
      token: options?.cogneeToken,
    });

    return { success: true, campaignId: campaignId!, result };
  } catch (error) {
    if (payload.campaignId) {
      await prisma.outreachCampaign.updateMany({
        where: { id: payload.campaignId, userId, status: "pending" },
        data: { status: "draft" },
      });
    }
    throw error;
  }
}
