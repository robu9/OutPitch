import { Router } from "express";
import { OnboardingPayloadSchema } from "@outpitch/types";
import { prisma } from "@outpitch/db";
import { asyncHandler, AppError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getLinkedInProfileWithRetry,
  getGmailAuthUrl,
  getLinkedInAuthUrl,
  checkConnectionStatus,
  disconnectToolkit,
} from "../services/composio.js";
import { ingestUserProfile } from "../services/cognee.js";
import {
  normalizeLinkedInProfileFields,
  profileHasLinkedInData,
} from "../services/linkedin-profile.js";

const router = Router();

const linkedInSyncInFlight = new Set<string>();

export async function syncLinkedInForUser(userId: string, clerkId: string) {
  const profile = await getLinkedInProfileWithRetry(clerkId);
  if (!profile) {
    throw new AppError(400, "LinkedIn not connected", "LINKEDIN_NOT_CONNECTED");
  }

  const fields = normalizeLinkedInProfileFields(profile);
  const user = await prisma.user.findUnique({ where: { id: userId } });

  await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      headline: fields.headline,
      summary: fields.summary,
      linkedinData: profile as object,
    },
    update: {
      headline: fields.headline,
      summary: fields.summary,
      linkedinData: profile as object,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      linkedinConnected: true,
      ...(fields.name ? { name: fields.name } : {}),
    },
  });

  await ingestUserProfile(clerkId, profile, user?.cogneeToken ?? undefined);

  return profile;
}

async function ensureLinkedInSynced(userId: string, clerkId: string, linkedinConnected: boolean) {
  if (!linkedinConnected || linkedInSyncInFlight.has(clerkId)) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  const existing = user?.profile?.linkedinData as Record<string, unknown> | undefined;
  if (existing && profileHasLinkedInData(existing) && existing.personProfile) {
    return false;
  }

  linkedInSyncInFlight.add(clerkId);
  try {
    await syncLinkedInForUser(userId, clerkId);
    return true;
  } catch (error) {
    console.warn("LinkedIn auto-sync failed:", error);
    return false;
  } finally {
    linkedInSyncInFlight.delete(clerkId);
  }
}

router.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const connections = await checkConnectionStatus(req.auth!.clerkId);

    const synced = await ensureLinkedInSynced(
      req.auth!.userId,
      req.auth!.clerkId,
      connections.linkedin
    );

    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { profile: true },
    });

    res.json({
      onboardingDone: user?.onboardingDone ?? false,
      linkedinConnected: connections.linkedin,
      gmailConnected: connections.gmail,
      linkedinProfileSynced: Boolean(user?.profile?.linkedinData),
      linkedinSyncing: linkedInSyncInFlight.has(req.auth!.clerkId),
      profile: user?.profile,
      ...(synced ? { linkedinJustSynced: true } : {}),
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
  "/disconnect/linkedin",
  requireAuth,
  asyncHandler(async (req, res) => {
    await disconnectToolkit(req.auth!.clerkId, "linkedin");

    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { linkedinConnected: false },
    });

    await prisma.userProfile.updateMany({
      where: { userId: req.auth!.userId },
      data: { linkedinData: undefined },
    });

    res.json({ success: true, linkedinConnected: false });
  })
);

router.post(
  "/disconnect/gmail",
  requireAuth,
  asyncHandler(async (req, res) => {
    await disconnectToolkit(req.auth!.clerkId, "gmail");

    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { gmailConnected: false },
    });

    res.json({ success: true, gmailConnected: false });
  })
);

router.post(
  "/linkedin-sync",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await syncLinkedInForUser(req.auth!.userId, req.auth!.clerkId);
    res.json({ success: true, profile });
  })
);

router.post(
  "/linkedin-connected",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await syncLinkedInForUser(req.auth!.userId, req.auth!.clerkId);
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

    if (connections.linkedin) {
      await syncLinkedInForUser(req.auth!.userId, req.auth!.clerkId).catch((error) => {
        console.warn("LinkedIn auto-sync after onboarding failed:", error);
      });
    }

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
