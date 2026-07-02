import { Composio } from "@composio/core";
import { config } from "../config.js";
import { AppError } from "../middleware/error.js";

let composioClient: Composio | null = null;

function getComposio(): Composio {
  if (!composioClient) {
    if (!config.composioApiKey) {
      throw new AppError(
        503,
        "Composio is not configured. Add COMPOSIO_API_KEY to your .env file.",
        "COMPOSIO_NOT_CONFIGURED"
      );
    }
    composioClient = new Composio({ apiKey: config.composioApiKey });
  }
  return composioClient;
}

function toComposioError(error: unknown, toolkit: string): AppError {
  const message = error instanceof Error ? error.message : "Composio request failed";

  if (message.includes("Invalid API key") || message.includes("401")) {
    return new AppError(
      503,
      "Composio rejected this API key. Use a full project API key from composio.dev (Settings → Project Settings).",
      "COMPOSIO_AUTH_FAILED"
    );
  }

  if (
    message.includes("No auth configs found") ||
    message.includes("No Default auth config") ||
    message.includes("connected_accounts/link")
  ) {
    return new AppError(
      503,
      `Auth is not set up in Composio for ${toolkit}. Enable the ${toolkit} toolkit in your Composio dashboard.`,
      "COMPOSIO_TOOLKIT_NOT_CONFIGURED"
    );
  }

  return new AppError(503, message, "COMPOSIO_ERROR");
}

async function getOrCreateAuthConfigId(toolkit: string): Promise<string> {
  const composio = getComposio();
  const configs = await composio.authConfigs.list({ toolkit });
  const enabled = (configs.items ?? []).filter((c) => c.status === "ENABLED");

  if (enabled.length > 0) {
    return enabled[0].id;
  }

  const created = await composio.authConfigs.create(toolkit, {
    type: "use_composio_managed_auth",
    name: `${toolkit} (Outpitch)`,
  });

  return created.id;
}

async function getToolkitAuthUrl(userId: string, toolkit: string): Promise<string> {
  const composio = getComposio();

  try {
    const authConfigId = await getOrCreateAuthConfigId(toolkit);
    const connectionRequest = await composio.connectedAccounts.link(userId, authConfigId, {
      callbackUrl: `${config.appUrl}/settings`,
    });
    const url = connectionRequest.redirectUrl ?? "";
    if (!url) {
      throw new AppError(
        502,
        `Composio did not return an OAuth URL for ${toolkit}.`,
        "COMPOSIO_NO_REDIRECT"
      );
    }
    return url;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw toComposioError(error, toolkit);
  }
}

export async function getLinkedInAuthUrl(userId: string): Promise<string> {
  return getToolkitAuthUrl(userId, "linkedin");
}

export async function getGmailAuthUrl(userId: string): Promise<string> {
  return getToolkitAuthUrl(userId, "gmail");
}

export async function getLinkedInProfile(userId: string) {
  const composio = getComposio();
  try {
    const result = await composio.tools.execute("LINKEDIN_GET_MY_INFO", {
      userId,
      arguments: {},
      dangerouslySkipVersionCheck: true,
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
    dangerouslySkipVersionCheck: true,
  });
  return result.data as Record<string, unknown>;
}

export async function fetchEmails(userId: string, limit = 20) {
  const composio = getComposio();
  try {
    const result = await composio.tools.execute("GMAIL_FETCH_EMAILS", {
      userId,
      arguments: { max_results: limit },
      dangerouslySkipVersionCheck: true,
    });
    return result.data as Record<string, unknown>;
  } catch (error) {
    console.warn("Gmail fetch failed:", error);
    return null;
  }
}

type ToolkitSlug = "linkedin" | "gmail";

async function getConnectedAccounts(userId: string) {
  const composio = getComposio();
  const accounts = await composio.connectedAccounts.list({ userIds: [userId] });
  return accounts.items ?? [];
}

function hasToolkitConnection(
  accounts: Awaited<ReturnType<typeof getConnectedAccounts>>,
  toolkit: ToolkitSlug
) {
  return accounts.some(
    (a: any) => (a.toolkit?.slug ?? a.appName ?? "").toLowerCase() === toolkit
  );
}

export async function checkConnectionStatus(userId: string) {
  try {
    const accounts = await getConnectedAccounts(userId);
    return {
      linkedin: hasToolkitConnection(accounts, "linkedin"),
      gmail: hasToolkitConnection(accounts, "gmail"),
    };
  } catch {
    return { linkedin: false, gmail: false };
  }
}

export async function disconnectToolkit(userId: string, toolkit: ToolkitSlug) {
  const composio = getComposio();
  const accounts = await getConnectedAccounts(userId);
  const matches = accounts.filter(
    (a: any) => (a.toolkit?.slug ?? a.appName ?? "").toLowerCase() === toolkit
  );

  for (const account of matches) {
    await composio.connectedAccounts.delete((account as any).id);
  }

  return { disconnected: matches.length > 0 };
}
