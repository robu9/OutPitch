import { Composio } from "@composio/core";
import { config } from "../config.js";

let composioClient: Composio | null = null;

function getComposio(): Composio {
  if (!composioClient) {
    if (!config.composioApiKey) {
      throw new Error("COMPOSIO_API_KEY is not configured");
    }
    composioClient = new Composio({ apiKey: config.composioApiKey });
  }
  return composioClient;
}

export async function createUserSession(
  userId: string,
  toolkits: string[] = ["linkedin", "gmail"]
) {
  const composio = getComposio();
  return composio.experimental.toolRouter.createSession(userId, { toolkits });
}

export async function getLinkedInAuthUrl(userId: string): Promise<string> {
  const composio = getComposio();
  const connection = await composio.toolkits.authorize(userId, "linkedin");
  return connection.redirectUrl ?? "";
}

export async function getGmailAuthUrl(userId: string): Promise<string> {
  const composio = getComposio();
  const connection = await composio.toolkits.authorize(userId, "gmail");
  return connection.redirectUrl ?? "";
}

export async function getLinkedInProfile(userId: string) {
  const composio = getComposio();
  try {
    const result = await composio.tools.execute("LINKEDIN_GET_MY_INFO", {
      userId,
      arguments: {},
    });
    return result.data as Record<string, unknown>;
  } catch (error) {
    console.warn("LinkedIn profile fetch failed:", error);
    return null;
  }
}

export async function sendEmail(
  userId: string,
  params: { to: string; subject: string; body: string }
) {
  const composio = getComposio();
  const result = await composio.tools.execute("GMAIL_SEND_EMAIL", {
    userId,
    arguments: {
      recipient_email: params.to,
      subject: params.subject,
      body: params.body,
    },
  });
  return result.data as Record<string, unknown>;
}

export async function fetchEmails(userId: string, limit = 20) {
  const composio = getComposio();
  try {
    const result = await composio.tools.execute("GMAIL_FETCH_EMAILS", {
      userId,
      arguments: { max_results: limit },
    });
    return result.data as Record<string, unknown>;
  } catch (error) {
    console.warn("Gmail fetch failed:", error);
    return null;
  }
}

export async function checkConnectionStatus(userId: string) {
  const composio = getComposio();
  try {
    const accounts = await composio.connectedAccounts.list({ userIds: [userId] });
    const linked = accounts.items ?? [];
    return {
      linkedin: linked.some((a) => a.toolkit?.slug?.toLowerCase() === "linkedin"),
      gmail: linked.some((a) => a.toolkit?.slug?.toLowerCase() === "gmail"),
    };
  } catch {
    return { linkedin: false, gmail: false };
  }
}
