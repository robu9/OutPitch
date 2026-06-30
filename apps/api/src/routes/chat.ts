import { Router } from "express";
import { z } from "zod";
import { prisma } from "@outpitch/db";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { runAgent, getPipelineStatus } from "../agent/outpitch-agent.js";

const router = Router();

const ChatMessageSchema = z.object({
  message: z.string().min(1),
});

router.get(
  "/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const messages = await prisma.chatMessage.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    res.json({ messages });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { message } = ChatMessageSchema.parse(req.body);

    await prisma.chatMessage.create({
      data: {
        userId: req.auth!.userId,
        role: "user",
        content: message,
      },
    });

    const history = await prisma.chatMessage.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    try {
      const agentHistory = history
        .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
        .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }));

      for await (const chunk of runAgent(message, agentHistory, {
        userId: req.auth!.userId,
        clerkId: req.auth!.clerkId,
        cogneeToken: user?.cogneeToken ?? undefined,
      })) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
      }

      await prisma.chatMessage.create({
        data: {
          userId: req.auth!.userId,
          role: "assistant",
          content: fullResponse,
        },
      });

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Agent error";
      res.write(`data: ${JSON.stringify({ type: "error", content: errMsg })}\n\n`);
    }

    res.end();
  })
);

router.get(
  "/pipeline/:jobId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = await getPipelineStatus(
      Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId,
      req.auth!.userId
    );
    if (!status) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(status);
  })
);

export default router;
