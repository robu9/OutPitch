import crypto from "crypto";
import { config } from "../config.js";

const GRAPH_VERSION = "v21.0";
const MAX_MESSAGE_LENGTH = 4096;

function graphUrl(): string {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${config.whatsappPhoneNumberId}/messages`;
}

function chunkText(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > MAX_MESSAGE_LENGTH) {
    // prefer to split on a newline near the limit, else hard split
    let cut = remaining.lastIndexOf("\n", MAX_MESSAGE_LENGTH);
    if (cut < MAX_MESSAGE_LENGTH * 0.5) cut = MAX_MESSAGE_LENGTH;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

/**
 * Send a text message to a WhatsApp number via the Meta Cloud API.
 * Long messages are split into <=4096-char chunks and sent in order.
 */
export async function sendWhatsAppMessage(
  toNumber: string,
  text: string
): Promise<void> {
  if (!config.whatsappToken || !config.whatsappPhoneNumberId) {
    console.warn("WhatsApp not configured — skipping outbound message");
    return;
  }

  for (const body of chunkText(text)) {
    const res = await fetch(graphUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.whatsappToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber,
        type: "text",
        text: { body },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`WhatsApp send failed (${res.status}): ${errText}`);
      return;
    }
  }
}

/**
 * Verify the X-Hub-Signature-256 header Meta sends with webhook POSTs.
 * The signature is `sha256=<hmac>` over the exact raw request body.
 */
export function verifyWhatsAppSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined
): boolean {
  if (!config.whatsappAppSecret) {
    // No secret configured — cannot verify; treat as unverified unless in dev.
    return config.nodeEnv === "development";
  }
  if (!rawBody || !signatureHeader) return false;

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", config.whatsappAppSecret)
      .update(rawBody)
      .digest("hex");

  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
