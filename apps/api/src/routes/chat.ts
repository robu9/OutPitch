import { Router } from "express";
import { z } from "zod";
import { prisma } from "@outpitch/db";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { runAgent, getPipelineStatus } from "../agent/outpitch-agent.js";

const router = Router();

const TOOL_MARKER = /\n?\[Using tool: [^\]]+\]\n?/g;

const ChatMessageSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
});

function sessionTitleFrom(message: string): string {
  const clean = message.trim().replace(/\s+/g, " ");
  return clean.length > 60 ? clean.slice(0, 57) + "…" : clean || "New chat";
}

// List the user's chat sessions (most recently updated first).
router.get(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.auth!.userId, channel: "web" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, createdAt: true },
      take: 100,
    });
    res.json({ sessions });
  })
);

// Create a new empty chat session.
router.post(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await prisma.chatSession.create({
      data: { userId: req.auth!.userId },
      select: { id: true, title: true, updatedAt: true, createdAt: true },
    });
    res.json({ session });
  })
);

// Delete a chat session (and its messages via cascade).
router.delete(
  "/sessions/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.chatSession.deleteMany({
      where: { id, userId: req.auth!.userId },
    });
    res.json({ success: true });
  })
);

router.get(
  "/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessionId =
      typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;

    const messages = await prisma.chatMessage.findMany({
      where: sessionId
        ? { userId: req.auth!.userId, sessionId }
        : { userId: req.auth!.userId, sessionId: null },
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
    const { message, sessionId } = ChatMessageSchema.parse(req.body);

    // Resolve the session: reuse the provided one (if it belongs to the user) or create a new one.
    let session = sessionId
      ? await prisma.chatSession.findFirst({
          where: { id: sessionId, userId: req.auth!.userId },
        })
      : null;

    if (!session) {
      session = await prisma.chatSession.create({
        data: { userId: req.auth!.userId, title: sessionTitleFrom(message) },
      });
    } else if (session.title === "New chat") {
      // First real message in a fresh session — name it.
      session = await prisma.chatSession.update({
        where: { id: session.id },
        data: { title: sessionTitleFrom(message) },
      });
    }

    await prisma.chatMessage.create({
      data: {
        userId: req.auth!.userId,
        sessionId: session.id,
        role: "user",
        content: message,
      },
    });

    const history = await prisma.chatMessage.findMany({
      where: { userId: req.auth!.userId, sessionId: session.id },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Tell the client which session this stream belongs to (for new sessions).
    res.write(`data: ${JSON.stringify({ type: "session", sessionId: session.id, title: session.title })}\n\n`);

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
        // Strip the internal "[Using tool: X]" progress markers so they aren't
        // shown to the user, saved to history, or replayed into the model.
        const clean = chunk.replace(TOOL_MARKER, "");
        if (!clean) continue;
        fullResponse += clean;
        res.write(`data: ${JSON.stringify({ type: "chunk", content: clean })}\n\n`);
      }

      await prisma.chatMessage.create({
        data: {
          userId: req.auth!.userId,
          sessionId: session.id,
          role: "assistant",
          content: fullResponse,
        },
      });

      // Bump the session so it sorts to the top of the history list.
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
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
