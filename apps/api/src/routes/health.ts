import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";

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
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  })
);

export default router;
