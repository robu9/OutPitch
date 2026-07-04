import { Composio } from "@composio/core";
import { config } from "../config.js";
import { AppError } from "../middleware/error.js";
import {
  extractPersonId,
  normalizeLinkedInProfileFields,
} from "./linkedin-profile.js";
import { scrapeLinkedInViaApify } from "./apify.js";

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
    ...(toolkit === "linkedin"
      ? {
          credentials: {
            scopes: [
              "openid",
              "profile",
              "email",
              "w_member_social",
              "r_member_social",
              "r_profile_basicinfo",
              "r_primary_current_experience",
              "r_most_recent_education",
            ],
          },
        }
      : {}),
  });

  return created.id;
}

async function getToolkitAuthUrl(userId: string, toolkit: string): Promise<string> {
  const composio = getComposio();

  try {
    const authConfigId = await getOrCreateAuthConfigId(toolkit);
    const connectionRequest = await composio.connectedAccounts.link(userId, authConfigId, {
      callbackUrl: `${config.appUrl}/settings?connect=${toolkit}`,
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

async function executeLinkedInTool(
  userId: string,
  slug: string,
  args: Record<string, unknown> = {}
) {
  const composio = getComposio();
  try {
    const result = await composio.tools.execute(slug, {
      userId,
      arguments: args,
      dangerouslySkipVersionCheck: true,
    });
    return (result.data ?? {}) as Record<string, unknown>;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("Error executing") ||
      msg.includes("token") ||
      msg.includes("expired") ||
      msg.includes("unauthorized") ||
      msg.includes("401")
    ) {
      throw new AppError(
        401,
        `LinkedIn OAuth token may have expired. Please reconnect LinkedIn in Settings to refresh your access.`,
        "LINKEDIN_TOKEN_EXPIRED"
      );
    }
    throw error;
  }
}

async function fetchLinkedInPosts(
  userId: string,
  personId: string
): Promise<Array<{ text?: string; createdAt?: string; url?: string }>> {
  try {
    const authorUrn = `urn:li:person:${personId}`;
    const result = await executeLinkedInTool(userId, "LINKEDIN_ADS_LIST_POSTS", {
      author: authorUrn,
      count: 30,
    });

    const elements = (result.elements ?? result.results ?? result.data) as
      | Array<Record<string, unknown>>
      | undefined;

    if (!Array.isArray(elements)) {
      console.warn("LINKEDIN_ADS_LIST_POSTS returned unexpected shape:", Object.keys(result));
      return [];
    }

    return elements.map((post) => {
      const commentary =
        (post.commentary as string) ??
        (post.specificContent as any)?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text ??
        (post.text as string) ??
        "";

      const created = post.createdAt ?? post.created ?? post.publishedAt;
      const createdAt =
        typeof created === "number"
          ? new Date(created).toISOString().split("T")[0]
          : typeof created === "string"
            ? created
            : undefined;

      const postId = (post.id ?? post.urn ?? "") as string;
      const url = postId
        ? `https://www.linkedin.com/feed/update/${postId}`
        : undefined;

      return { text: commentary, createdAt, url };
    }).filter((p) => p.text && p.text.length > 0);
  } catch (error) {
    console.warn("LinkedIn posts fetch failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

async function fetchPostContent(
  userId: string,
  postUrn: string
): Promise<string | null> {
  try {
    const result = await executeLinkedInTool(userId, "LINKEDIN_GET_POST_CONTENT", {
      post_urn: postUrn,
    });
    return (result.commentary as string) ?? (result.text as string) ?? null;
  } catch {
    return null;
  }
}

export async function getLinkedInProfile(userId: string) {
  try {
    const myInfo = await executeLinkedInTool(userId, "LINKEDIN_GET_MY_INFO");
    const profile: Record<string, unknown> = { myInfo, ...myInfo };

    const personId = extractPersonId(myInfo);
    if (personId) {
      try {
        const personProfile = await executeLinkedInTool(userId, "LINKEDIN_GET_PERSON", {
          person_id: personId,
        });
        profile.personProfile = personProfile;
        Object.assign(profile, personProfile);
      } catch (error) {
        if (error instanceof AppError && error.code === "LINKEDIN_TOKEN_EXPIRED") throw error;
        console.warn("LinkedIn person profile fetch failed:", error);
      }
    }

    // Fetch posts via API (reliable — uses authenticated access)
    if (personId) {
      try {
        const posts = await fetchLinkedInPosts(userId, personId);
        if (posts.length > 0) {
          profile.posts = posts;
          console.log(`Fetched ${posts.length} LinkedIn posts via API for ${personId}`);
        }
      } catch (error) {
        if (error instanceof AppError && error.code === "LINKEDIN_TOKEN_EXPIRED") throw error;
        console.warn("LinkedIn posts API failed:", error);
      }
    }

    // Scrape the public profile page for supplementary data
    // (about, skills, certifications, projects — things the API may not return)
    const vanityName =
      (profile.vanityName as string) ??
      ((profile.personProfile as Record<string, unknown>)?.vanityName as string);
    if (vanityName) {
      try {
        const scraped = await scrapeLinkedInViaApify(vanityName);
        if (scraped) {
          profile.scraped = scraped;
          if (scraped.location && !profile.location) profile.location = scraped.location;
          if (scraped.about && !profile.about) profile.about = scraped.about;
          if (scraped.experience.length > 0 && !profile.experience) profile.experience = scraped.experience;
          if (scraped.education.length > 0 && !profile.education) profile.education = scraped.education;
          if (scraped.skills.length > 0 && !profile.skills) profile.skills = scraped.skills;
          if (scraped.certifications.length > 0) profile.certifications = scraped.certifications;
          if (scraped.projects.length > 0) profile.projects = scraped.projects;
          if (scraped.activity.length > 0 && !profile.activity) profile.activity = scraped.activity;
        } else {
          console.log(
            `LinkedIn scrape returned null for ${vanityName} — profile will have API data only. ` +
              `Use POST /onboarding/import-profile to manually add full profile data.`
          );
        }
      } catch (error) {
        console.warn("LinkedIn scrape failed:", error);
      }
    }

    profile.syncedAt = new Date().toISOString();
    return profile;
  } catch (error) {
    if (error instanceof AppError && error.code === "LINKEDIN_TOKEN_EXPIRED") {
      throw error;
    }
    console.warn("LinkedIn profile fetch failed:", error);
    return null;
  }
}

export async function getLinkedInProfileWithRetry(
  userId: string,
  attempts = 4,
  delayMs = 1500
) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const profile = await getLinkedInProfile(userId);
      if (profile) return profile;
    } catch (error) {
      if (error instanceof AppError && error.code === "LINKEDIN_TOKEN_EXPIRED") {
        throw error;
      }
      console.warn(`LinkedIn profile attempt ${attempt}/${attempts} failed:`, error);
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
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
    const linkedinConnected = hasToolkitConnection(accounts, "linkedin");
    const gmailConnected = hasToolkitConnection(accounts, "gmail");

    let linkedinHealthy = false;
    if (linkedinConnected) {
      try {
        await executeLinkedInTool(userId, "LINKEDIN_GET_MY_INFO");
        linkedinHealthy = true;
      } catch (error) {
        const code = error instanceof AppError ? error.code : undefined;
        if (code === "LINKEDIN_TOKEN_EXPIRED") {
          console.warn(`LinkedIn token expired for ${userId} — user needs to reconnect`);
        }
      }
    }

    return {
      linkedin: linkedinConnected,
      linkedinHealthy,
      gmail: gmailConnected,
    };
  } catch {
    return { linkedin: false, linkedinHealthy: false, gmail: false };
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
