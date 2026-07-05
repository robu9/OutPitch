import { Router } from "express";
import { prisma, type Company, type CompanyContact, type UserCompanyLink } from "@outpitch/db";
import { CompanySearchParamsSchema } from "@outpitch/types";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { enqueueCompanyPipeline } from "../jobs/company-pipeline.js";
import { assessSearchReadiness, toSearchParams } from "../services/search-context.js";
import { improve, userDataset } from "../services/cognee.js";
import { verifyEmailExists } from "../services/email-verifier.js";
import { config } from "../config.js";
import { AppError } from "../middleware/error.js";

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

router.post(
  "/audit-emails",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (config.nodeEnv !== "development") {
      throw new AppError(403, "Audit only available in development", "DEV_ONLY");
    }

    const apply = req.query.apply === "true";

    const contacts = await prisma.companyContact.findMany({
      where: { email: { not: null } },
      include: { company: { select: { name: true, domain: true } } },
      orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
    });

    const valid: Array<{
      id: string;
      email: string;
      name: string;
      company: string;
      domain: string;
      deliverability: string;
      smtpCode?: number;
    }> = [];
    const invalid: Array<{
      id: string;
      email: string;
      name: string;
      company: string;
      domain: string;
      reason: string;
      smtpCode?: number;
    }> = [];

    for (const contact of contacts) {
      const email = contact.email!;
      const result = await verifyEmailExists(email);

      if (result.valid) {
        valid.push({
          id: contact.id,
          email,
          name: contact.name,
          company: contact.company.name,
          domain: contact.company.domain,
          deliverability: result.deliverability,
          smtpCode: result.smtpCode,
        });
      } else {
        invalid.push({
          id: contact.id,
          email,
          name: contact.name,
          company: contact.company.name,
          domain: contact.company.domain,
          reason: result.reason ?? result.deliverability,
          smtpCode: result.smtpCode,
        });
      }
    }

    let cleared = 0;
    if (apply && invalid.length > 0) {
      const updated = await prisma.companyContact.updateMany({
        where: { id: { in: invalid.map((c) => c.id) } },
        data: { email: null, confidence: 0 },
      });
      cleared = updated.count;
    }

    res.json({
      mode: apply ? "apply" : "dry-run",
      summary: {
        total: contacts.length,
        valid: valid.length,
        invalid: invalid.length,
        cleared,
      },
      valid,
      invalid,
    });
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
    const { feedback, rating } = req.body as { feedback: string; rating?: "good" | "bad" };
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });

    await prisma.userCompanyLink.update({
      where: {
        userId_companyId: {
          userId: req.auth!.userId,
          companyId: req.params.id,
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
