import { Router } from "express";
import { OnboardingPayloadSchema } from "@outpitch/types";
import { prisma } from "@outpitch/db";
import { asyncHandler, AppError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getLinkedInProfile,
  getGmailAuthUrl,
  getLinkedInAuthUrl,
  checkConnectionStatus,
} from "../services/composio.js";
import { ingestUserProfile } from "../services/cognee.js";

const router = Router();

router.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { profile: true },
    });

    const connections = await checkConnectionStatus(req.auth!.clerkId);

    res.json({
      onboardingDone: user?.onboardingDone ?? false,
      linkedinConnected: connections.linkedin,
      gmailConnected: connections.gmail,
      profile: user?.profile,
    });
  })
);

router.get(
  "/connect/linkedin",
  requireAuth,
  asyncHandler(async (req, res) => {
    const url = await getLinkedInAuthUrl(req.auth!.clerkId);
    res.json({ url });
  })
);

router.get(
  "/connect/gmail",
  requireAuth,
  asyncHandler(async (req, res) => {
    const url = await getGmailAuthUrl(req.auth!.clerkId);
    res.json({ url });
  })
);

router.post(
  "/linkedin-sync",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await getLinkedInProfile(req.auth!.clerkId);
    if (!profile) {
      throw new AppError(400, "LinkedIn not connected", "LINKEDIN_NOT_CONNECTED");
    }

    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });

    await prisma.userProfile.upsert({
      where: { userId: req.auth!.userId },
      create: {
        userId: req.auth!.userId,
        headline: (profile.headline as string) ?? undefined,
        summary: (profile.summary as string) ?? undefined,
        linkedinData: profile as object,
      },
      update: {
        headline: (profile.headline as string) ?? undefined,
        summary: (profile.summary as string) ?? undefined,
        linkedinData: profile as object,
      },
    });

    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { linkedinConnected: true },
    });

    await ingestUserProfile(req.auth!.clerkId, profile, user?.cogneeToken ?? undefined);

    res.json({ success: true, profile });
  })
);

router.post(
  "/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = OnboardingPayloadSchema.parse(req.body);

    await prisma.userProfile.upsert({
      where: { userId: req.auth!.userId },
      create: {
        userId: req.auth!.userId,
        ...payload,
      },
      update: payload,
    });

    const connections = await checkConnectionStatus(req.auth!.clerkId);

    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: {
        onboardingDone: true,
        gmailConnected: connections.gmail,
        linkedinConnected: connections.linkedin,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    await ingestUserProfile(
      req.auth!.clerkId,
      payload as Record<string, unknown>,
      user?.cogneeToken ?? undefined
    );

    res.json({ success: true });
  })
);

export default router;
