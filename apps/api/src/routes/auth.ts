import { Router } from "express";
import { Webhook } from "svix";
import { prisma } from "@outpitch/db";
import { config } from "../config.js";
import { asyncHandler } from "../middleware/error.js";
import { getOrCreateUser } from "../middleware/auth.js";
import { provisionCogneeUser } from "../services/cognee.js";
import { hasClerkLinkedInAccount } from "../services/clerk-linkedin.js";

const router = Router();

router.post(
  "/clerk",
  asyncHandler(async (req, res) => {
    if (!config.clerkWebhookSecret) {
      res.status(200).json({ received: true });
      return;
    }

    const wh = new Webhook(config.clerkWebhookSecret);
    const payload = wh.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"] as string,
      "svix-timestamp": req.headers["svix-timestamp"] as string,
      "svix-signature": req.headers["svix-signature"] as string,
    }) as { type: string; data: Record<string, unknown> };

    if (payload.type === "user.created" || payload.type === "user.updated") {
      const data = payload.data;
      const clerkId = data.id as string;
      const email = (data.email_addresses as Array<{ email_address: string }>)?.[0]?.email_address;
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined;

      const user = await getOrCreateUser(clerkId, { email, name });
      const linkedinConnected = await hasClerkLinkedInAccount(clerkId);
      if (linkedinConnected) {
        await prisma.user.update({
          where: { id: user.id },
          data: { linkedinConnected: true },
        });
      }

      if (!user.cogneeToken) {
        const cogneeUser = await provisionCogneeUser(clerkId, email);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            cogneeToken: cogneeUser.token,
            cogneeUserId: cogneeUser.id,
          },
        });
      }
    }

    res.status(200).json({ received: true });
  })
);

export default router;
