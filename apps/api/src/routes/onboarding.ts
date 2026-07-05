import { Router } from "express";
import { OnboardingPayloadSchema } from "@outpitch/types";
import { prisma } from "@outpitch/db";
import { asyncHandler, AppError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getGmailAuthUrl,
  checkConnectionStatus,
  disconnectToolkit,
  getGmailAddress,
} from "../services/composio.js";
import { hasClerkLinkedInAccount } from "../services/clerk-linkedin.js";
import { getLinkedInProfileFromClerkWithRetry } from "../services/linkedin-sync.js";
import { ingestUserProfile } from "../services/cognee.js";
import {
  normalizeLinkedInProfileFields,
  profileHasLinkedInData,
} from "../services/linkedin-profile.js";

const router = Router();

const linkedInSyncInFlight = new Set<string>();

export async function syncLinkedInForUser(userId: string, clerkId: string) {
  const linkedInViaClerk = await hasClerkLinkedInAccount(clerkId);
  if (!linkedInViaClerk) {
    throw new AppError(
      400,
      "Sign in with LinkedIn to import your profile.",
      "LINKEDIN_NOT_CONNECTED"
    );
  }

  const profile = await getLinkedInProfileFromClerkWithRetry(clerkId);
  if (!profile) {
    throw new AppError(400, "LinkedIn profile sync failed", "LINKEDIN_SYNC_FAILED");
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

// Kicks off a LinkedIn sync in the BACKGROUND (never awaited by the request) so
// GET /status returns immediately. The Apify scrape inside the sync can take tens
// of seconds; the client polls `linkedinSyncing` and picks up the result later.
async function ensureLinkedInSynced(userId: string, clerkId: string, linkedinConnected: boolean) {
  if (!linkedinConnected || linkedInSyncInFlight.has(clerkId)) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  const existing = user?.profile?.linkedinData as Record<string, unknown> | undefined;
  if (existing && profileHasLinkedInData(existing) && (existing.scraped || existing.personProfile)) {
    return false;
  }

  linkedInSyncInFlight.add(clerkId);
  // Detached — do not await. Errors are logged, and the in-flight flag is always cleared.
  void syncLinkedInForUser(userId, clerkId)
    .catch((error) => console.warn("LinkedIn auto-sync failed:", error))
    .finally(() => linkedInSyncInFlight.delete(clerkId));

  return true;
}

// Backfill the user's own email from the connected Gmail account if we don't have it.
async function ensureUserEmail(userId: string, clerkId: string, gmailConnected: boolean) {
  if (!gmailConnected) return;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.email) return;
  const email = await getGmailAddress(clerkId);
  if (email) {
    await prisma.user.update({ where: { id: userId }, data: { email } });
  }
}

router.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const connections = await checkConnectionStatus(req.auth!.clerkId);
    const linkedinConnected = await hasClerkLinkedInAccount(req.auth!.clerkId);

    const synced = linkedinConnected
      ? await ensureLinkedInSynced(req.auth!.userId, req.auth!.clerkId, linkedinConnected)
      : false;

    if (connections.gmail) {
      await ensureUserEmail(req.auth!.userId, req.auth!.clerkId, connections.gmail).catch((e) =>
        console.warn("ensureUserEmail failed:", e)
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { profile: true },
    });

    res.json({
      onboardingDone: user?.onboardingDone ?? false,
      linkedinConnected,
      gmailConnected: connections.gmail,
      linkedinProfileSynced: Boolean(user?.profile?.linkedinData),
      linkedinSyncing: linkedInSyncInFlight.has(req.auth!.clerkId),
      whatsappNumber: user?.whatsappNumber ?? null,
      whatsappVerified: user?.whatsappVerified ?? false,
      profile: user?.profile,
      ...(synced ? { linkedinJustSynced: true } : {}),
    });
  })
);

// Lightweight onboarding-status check (DB only, no Composio) — used by the app
// shell to gate un-onboarded users into the wizard without the slow /status call.
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { onboardingDone: true },
    });
    res.json({ onboardingDone: user?.onboardingDone ?? false });
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
    const linkedinConnected = await hasClerkLinkedInAccount(req.auth!.clerkId);

    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: {
        onboardingDone: true,
        gmailConnected: connections.gmail,
        linkedinConnected,
      },
    });

    if (linkedinConnected) {
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

router.post(
  "/import-profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { profileText } = req.body as { profileText?: string };
    if (!profileText || typeof profileText !== "string") {
      res.status(400).json({ error: "profileText is required (paste your full LinkedIn profile)" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    const { remember } = await import("../services/cognee.js");
    const { userDataset } = await import("../services/cognee.js");

    await remember(
      `Full LinkedIn profile (user-provided):\n${profileText}`,
      { dataset: userDataset(req.auth!.clerkId), token: user?.cogneeToken ?? undefined }
    );

    res.json({ success: true, message: "Profile data ingested into memory" });
  })
);

export default router;

