import { Router } from "express";
import { prisma, type Company, type CompanyContact, type UserCompanyLink } from "@outpitch/db";
import { CompanySearchParamsSchema } from "@outpitch/types";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { enqueueCompanyPipeline } from "../jobs/company-pipeline.js";
import { assessSearchReadiness, toSearchParams } from "../services/search-context.js";
import { improve, userDataset } from "../services/cognee.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;

    const links = await prisma.userCompanyLink.findMany({
      where: { userId },
      include: {
        company: { include: { contacts: true } },
      },
      orderBy: { matchScore: "desc" },
    });

    const companyIds = links.map((l) => l.companyId);
    const campaigns = companyIds.length
      ? await prisma.outreachCampaign.findMany({
          where: { userId, companyId: { in: companyIds } },
          select: {
            id: true,
            companyId: true,
            status: true,
            sentAt: true,
            contact: { select: { name: true, email: true } },
          },
          orderBy: { updatedAt: "desc" },
        })
      : [];

    const outreachByCompany = new Map<
      string,
      {
        status: string;
        sentAt: Date | null;
        campaignId: string;
        contactName?: string | null;
        contactEmail?: string | null;
      }
    >();

    for (const campaign of campaigns) {
      if (!campaign.companyId || outreachByCompany.has(campaign.companyId)) continue;
      outreachByCompany.set(campaign.companyId, {
        status: campaign.status,
        sentAt: campaign.sentAt,
        campaignId: campaign.id,
        contactName: campaign.contact?.name,
        contactEmail: campaign.contact?.email,
      });
    }

    type LinkWithCompany = UserCompanyLink & {
      company: Company & { contacts: CompanyContact[] };
    };

    res.json({
      companies: (links as LinkWithCompany[]).map((l) => ({
        ...(l.company as Record<string, unknown>),
        matchScore: l.matchScore,
        feedback: l.feedback,
        discoveredAt: l.discoveredAt,
        outreach: outreachByCompany.get(l.companyId) ?? null,
      })),
    });
  })
);

router.post(
  "/search",
  requireAuth,
  asyncHandler(async (req, res) => {
    const params = CompanySearchParamsSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });

    const readiness = await assessSearchReadiness(
      req.auth!.userId,
      req.auth!.clerkId,
      user?.cogneeToken ?? undefined,
      params
    );

    if (!readiness.ready) {
      res.status(422).json({
        error: "More context needed before searching",
        code: "INSUFFICIENT_SEARCH_CONTEXT",
        missing: readiness.missing,
        nextQuestion: readiness.nextQuestion,
        knownContext: readiness.contextSummary,
      });
      return;
    }

    const searchParams = toSearchParams(readiness.context, params);
    const job = await enqueueCompanyPipeline(
      req.auth!.userId,
      req.auth!.clerkId,
      searchParams,
      user?.cogneeToken ?? undefined
    );

    res.json({ jobId: job.id, status: job.status, searchContext: readiness.contextSummary });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({
      where: { id: String(req.params.id) },
      include: { contacts: true },
    });
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    res.json({ company });
  })
);

router.post(
  "/:id/feedback",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { feedback, rating } = req.body as { feedback: string; rating?: "good" | "bad" };
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });

    await prisma.userCompanyLink.update({
      where: {
        userId_companyId: {
          userId: req.auth!.userId,
          companyId: String(req.params.id),
        },
      },
      data: { feedback },
    });

    if (rating) {
      await improve(
        `${rating === "good" ? "Good match" : "Bad match"}: ${feedback}`,
        { dataset: userDataset(req.auth!.clerkId), token: user?.cogneeToken ?? undefined }
      );
    }

    res.json({ success: true });
  })
);

export default router;
