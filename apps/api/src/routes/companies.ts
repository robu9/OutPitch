import { Router } from "express";
import { prisma, type Company, type CompanyContact, type UserCompanyLink } from "@outpitch/db";
import { CompanySearchParamsSchema } from "@outpitch/types";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { enqueueCompanyPipeline } from "../jobs/company-pipeline.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const links = await prisma.userCompanyLink.findMany({
      where: { userId: req.auth!.userId },
      include: {
        company: { include: { contacts: true } },
      },
      orderBy: { matchScore: "desc" },
    });

    type LinkWithCompany = UserCompanyLink & {
      company: Company & { contacts: CompanyContact[] };
    };

    res.json({
      companies: (links as LinkWithCompany[]).map((l) => ({
        ...(l.company as Record<string, unknown>),
        matchScore: l.matchScore,
        feedback: l.feedback,
        discoveredAt: l.discoveredAt,
      })),
    });
  })
);

router.post(
  "/search",
  requireAuth,
  asyncHandler(async (req, res) => {
    const params = CompanySearchParamsSchema.parse(req.body);

    const job = await enqueueCompanyPipeline(
      req.auth!.userId,
      req.auth!.clerkId,
      params
    );

    res.json({ jobId: job.id, status: job.status });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
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
    const { feedback } = req.body as { feedback: string; rating?: "good" | "bad" };

    await prisma.userCompanyLink.update({
      where: {
        userId_companyId: {
          userId: req.auth!.userId,
          companyId: req.params.id,
        },
      },
      data: { feedback },
    });

    res.json({ success: true });
  })
);

export default router;
