import { config } from "../config.js";

type ClerkExternalAccount = {
  provider: string;
  username: string | null;
  provider_user_id?: string;
  public_metadata?: Record<string, unknown>;
};

export type ClerkUserSnapshot = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url?: string | null;
  external_accounts?: ClerkExternalAccount[];
};

function isLinkedInProvider(provider: string): boolean {
  const normalized = provider.toLowerCase();
  return normalized === "oauth_linkedin" || normalized === "linkedin" || normalized.includes("linkedin");
}

function vanityFromUrl(value: string): string | null {
  const match = value.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match?.[1]?.replace(/\/$/, "") ?? null;
}

export function extractLinkedInVanityFromClerkUser(user: ClerkUserSnapshot): string | null {
  const accounts = user.external_accounts ?? [];
  const linkedIn = accounts.find((a) => isLinkedInProvider(a.provider));
  if (!linkedIn) return null;

  if (linkedIn.username) {
    const fromUrl = vanityFromUrl(linkedIn.username);
    if (fromUrl) return fromUrl;
    return linkedIn.username.replace(/\/$/, "");
  }

  const meta = linkedIn.public_metadata ?? {};
  for (const key of ["profile_url", "linkedin_url", "url", "profileUrl"]) {
    const value = meta[key];
    if (typeof value === "string") {
      const vanity = vanityFromUrl(value);
      if (vanity) return vanity;
    }
  }

  return null;
}

export function extractLinkedInUrlFromClerkUser(user: ClerkUserSnapshot): string | null {
  const vanity = extractLinkedInVanityFromClerkUser(user);
  return vanity ? `https://www.linkedin.com/in/${vanity}/` : null;
}

export async function getClerkUser(clerkId: string): Promise<ClerkUserSnapshot | null> {
  if (!config.clerkSecretKey) {
    console.warn("CLERK_SECRET_KEY not set — cannot read LinkedIn from Clerk");
    return null;
  }

  const response = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
    headers: { Authorization: `Bearer ${config.clerkSecretKey}` },
  });

  if (!response.ok) {
    console.warn(`Clerk user fetch failed (${response.status}) for ${clerkId}`);
    return null;
  }

  return (await response.json()) as ClerkUserSnapshot;
}

export async function hasClerkLinkedInAccount(clerkId: string): Promise<boolean> {
  const user = await getClerkUser(clerkId);
  if (!user) return false;
  return Boolean(extractLinkedInVanityFromClerkUser(user));
}

export async function getClerkLinkedInVanity(clerkId: string): Promise<string | null> {
  const user = await getClerkUser(clerkId);
  if (!user) return null;
  return extractLinkedInVanityFromClerkUser(user);
}
