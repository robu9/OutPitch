import { Router } from "express";
import { SendEmailPayloadSchema } from "@outpitch/types";
import { prisma } from "@outpitch/db";
import { asyncHandler, AppError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { sendEmail, fetchEmails } from "../services/composio.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const campaigns = await prisma.outreachCampaign.findMany({
      where: { userId: req.auth!.userId },
      include: { company: true, contact: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ campaigns });
  })
);

router.post(
  "/send",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = SendEmailPayloadSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });

    if (!user?.gmailConnected) {
      throw new AppError(400, "Gmail not connected", "GMAIL_NOT_CONNECTED");
    }

    const result = await sendEmail(req.auth!.clerkId, {
      to: payload.to,
      subject: payload.subject,
      body: payload.body,
    });

    let campaign;
    if (payload.campaignId) {
      campaign = await prisma.outreachCampaign.update({
        where: { id: payload.campaignId },
        data: { status: "sent", sentAt: new Date() },
      });
    } else {
      campaign = await prisma.outreachCampaign.create({
        data: {
          user: { connect: { id: req.auth!.userId } },
          ...(payload.companyId
            ? { company: { connect: { id: payload.companyId } } }
            : {}),
          subject: payload.subject,
          body: payload.body,
          status: "sent",
          sentAt: new Date(),
        },
      });
    }

    res.json({ success: true, result, campaignId: campaign?.id });
  })
);

router.post(
  "/sync",
  requireAuth,
  asyncHandler(async (req, res) => {
    const emails = await fetchEmails(req.auth!.clerkId, 30);
    res.json({ emails });
  })
);

router.get(
  "/threads",
  requireAuth,
  asyncHandler(async (req, res) => {
    const threads = await prisma.emailThread.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ threads });
  })
);

export default router;
