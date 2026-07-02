import { Router } from "express";
import { prisma } from "@outpitch/db";
import { asyncHandler } from "../middleware/error.js";
import { createRedisClient } from "../lib/redis.js";
import { getCogneeBackend, isCogneeReady } from "../services/cognee.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({
      name: "Outpitch API",
      version: "0.1.0",
      status: "ok",
    });
  })
);

router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const checks: Record<string, string> = { api: "ok" };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch {
      checks.database = "error";
    }

    try {
      const redis = createRedisClient(1);
      await redis.ping();
      await redis.quit();
      checks.redis = "ok";
    } catch {
      checks.redis = "error";
    }

    const healthy = Object.values(checks).every((v) => v === "ok");
    res.status(healthy ? 200 : 503).json({
      status: healthy ? "healthy" : "degraded",
      checks: {
        ...checks,
        cognee: isCogneeReady() ? getCogneeBackend() : "disabled",
      },
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
