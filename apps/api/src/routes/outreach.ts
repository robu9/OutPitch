import { Router } from "express";
import { SendEmailPayloadSchema } from "@outpitch/types";
import { prisma } from "@outpitch/db";
import { asyncHandler, AppError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { fetchEmails, checkConnectionStatus } from "../services/composio.js";
import { sendOutreachCampaign } from "../services/outreach-send.js";

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

    // Settings reads Composio live; the DB flag can lag after OAuth — trust Composio here.
    const connections = await checkConnectionStatus(req.auth!.clerkId);
    if (!connections.gmail) {
      throw new AppError(400, "Gmail not connected", "GMAIL_NOT_CONNECTED");
    }

    if (user && !user.gmailConnected) {
      await prisma.user.update({
        where: { id: req.auth!.userId },
        data: { gmailConnected: true },
      });
    }

    const result = await sendOutreachCampaign(
      req.auth!.userId,
      req.auth!.clerkId,
      payload,
      { cogneeToken: user?.cogneeToken ?? undefined }
    );

    res.json(result);
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
