import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "@outpitch/db";
import { config } from "../config.js";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import {
  sendWhatsAppMessage,
  verifyWhatsAppSignature,
} from "../services/whatsapp.js";
import { runAgent } from "../agent/outpitch-agent.js";

const router = Router();

const TOOL_MARKER = /\n?\[Using tool: [^\]]+\]\n?/g;

function normalizeNumber(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  return `+${digits}`;
}

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const LinkSchema = z.object({ number: z.string().min(6) });

// --- Web-initiated linking: user submits their WhatsApp number ---
router.post(
  "/link",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { number } = LinkSchema.parse(req.body);
    const whatsappNumber = normalizeNumber(number);
    const code = genCode();

    // Detach this number from any other account before claiming it.
    await prisma.user.updateMany({
      where: { whatsappNumber, NOT: { id: req.auth!.userId } },
      data: { whatsappNumber: null, whatsappVerified: false, whatsappVerifyCode: null },
    });

    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { whatsappNumber, whatsappVerified: false, whatsappVerifyCode: code },
    });

    res.json({
      code,
      number: whatsappNumber,
      businessNumber: config.whatsappPhoneNumberId
        ? "the OutPitch WhatsApp business number"
        : null,
      message: `Text the code ${code} to our WhatsApp number to finish linking.`,
    });
  })
);

// --- Meta webhook verification handshake ---
router.get(
  "/webhook",
  asyncHandler(async (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === config.whatsappVerifyToken) {
      res.status(200).send(String(challenge ?? ""));
      return;
    }
    res.sendStatus(403);
  })
);

// --- Meta webhook inbound messages ---
router.post(
  "/webhook",
  asyncHandler(async (req: Request, res) => {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const signature = req.headers["x-hub-signature-256"] as string | undefined;

    if (!verifyWhatsAppSignature(rawBody, signature)) {
      res.sendStatus(401);
      return;
    }

    // Ack immediately — Meta retries if we are slow. Process asynchronously.
    res.sendStatus(200);

    void handleInbound(req.body).catch((err) => {
      console.error("WhatsApp inbound processing failed:", err);
    });
  })
);

interface InboundMessage {
  from: string;
  text?: { body?: string };
  type: string;
}

async function handleInbound(body: unknown): Promise<void> {
  const payload = body as {
    entry?: Array<{
      changes?: Array<{ value?: { messages?: InboundMessage[] } }>;
    }>;
  };

  const messages =
    payload.entry?.flatMap(
      (e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []
    ) ?? [];

  for (const msg of messages) {
    if (msg.type !== "text" || !msg.text?.body) continue;
    await processMessage(normalizeNumber(msg.from), msg.text.body.trim());
  }
}

async function processMessage(from: string, text: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { whatsappNumber: from } });

  if (!user) {
    await sendWhatsAppMessage(
      from,
      "This number isn't linked to an OutPitch account. Add your WhatsApp number in OutPitch → Settings to get started."
    );
    return;
  }

  // Verification step: the message must match the pending code.
  if (!user.whatsappVerified) {
    if (user.whatsappVerifyCode && text === user.whatsappVerifyCode) {
      await prisma.user.update({
        where: { id: user.id },
        data: { whatsappVerified: true, whatsappVerifyCode: null },
      });
      await sendWhatsAppMessage(
        from,
        "✅ Your WhatsApp is now linked to OutPitch. Ask me to find companies, draft outreach, or refresh your LinkedIn profile."
      );
    } else {
      await sendWhatsAppMessage(
        from,
        "Please reply with the 6-digit code shown in OutPitch → Settings to finish linking."
      );
    }
    return;
  }

  // Verified: route into the shared agent, same as web chat.
  // Keep WhatsApp in its own persistent session, separate from web chat history.
  let waSession = await prisma.chatSession.findFirst({
    where: { userId: user.id, channel: "whatsapp" },
    orderBy: { createdAt: "asc" },
  });
  if (!waSession) {
    waSession = await prisma.chatSession.create({
      data: { userId: user.id, channel: "whatsapp", title: "WhatsApp" },
    });
  }

  await prisma.chatMessage.create({
    data: { userId: user.id, sessionId: waSession.id, role: "user", content: text, channel: "whatsapp" },
  });

  const history = await prisma.chatMessage.findMany({
    where: { userId: user.id, sessionId: waSession.id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const agentHistory = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  let reply = "";
  try {
    for await (const chunk of runAgent(text, agentHistory, {
      userId: user.id,
      clerkId: user.clerkId,
      cogneeToken: user.cogneeToken ?? undefined,
    })) {
      reply += chunk;
    }
  } catch (error) {
    console.error("Agent run failed for WhatsApp:", error);
    await sendWhatsAppMessage(
      from,
      "Sorry, something went wrong processing that. Please try again."
    );
    return;
  }

  reply = reply.replace(TOOL_MARKER, "").trim();
  if (!reply) reply = "Done.";

  await prisma.chatMessage.create({
    data: { userId: user.id, sessionId: waSession.id, role: "assistant", content: reply, channel: "whatsapp" },
  });

  await sendWhatsAppMessage(from, reply);
}

export default router;
