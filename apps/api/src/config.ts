import "./load-env.js";

export const config = {
  port: parseInt(process.env.API_PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: (process.env.REDIS_URL ?? "").replace(/^["']|["']$/g, ""),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  cogneeApiUrl: process.env.COGNEE_API_URL ?? "https://api.cognee.ai",
  cogneeServiceToken: process.env.COGNEE_SERVICE_TOKEN ?? process.env.COGNEE_API_KEY ?? "",
  cogneeTenantId: process.env.COGNEE_TENANT_ID ?? "",
  composioApiKey: process.env.COMPOSIO_API_KEY ?? "",
  serperApiKey: process.env.SERPER_API_KEY ?? "",
  apolloApiKey: (process.env.APOLLO_API_KEY ?? "").replace(/^["']|["']$/g, ""),
  apifyApiToken: process.env.APIFY_API_TOKEN ?? "",
  apifyLinkedInActor: process.env.APIFY_LINKEDIN_ACTOR ?? "harvestapi/linkedin-profile-scraper",
  apifyProfileMode: process.env.APIFY_PROFILE_MODE ?? "Profile details no email ($4 per 1k)",
  apifyWaitSecs: parseInt(process.env.APIFY_WAIT_SECS ?? "45", 10),
  whatsappToken: process.env.WHATSAPP_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET ?? "",
  emailVerifierHeloDomain: process.env.EMAIL_VERIFIER_HELO_DOMAIN ?? "outpitch.app",
  emailVerifierFromEmail: process.env.EMAIL_VERIFIER_FROM_EMAIL ?? "verify@outpitch.app",
  emailVerifierSmtpTimeoutMs: parseInt(process.env.EMAIL_VERIFIER_SMTP_TIMEOUT_MS ?? "4000", 10),
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET ?? "",
};

function validateConfig() {
  const required = ["DATABASE_URL", "REDIS_URL"] as const;
  for (const key of required) {
    if (!process.env[key]) {
      console.warn(`Warning: ${key} is not set`);
    }
  }

  if (!config.composioApiKey) {
    console.warn("Warning: COMPOSIO_API_KEY is not set — LinkedIn/Gmail connect will fail");
  }

  if (!config.apifyApiToken) {
    console.warn("Warning: APIFY_API_TOKEN is not set — LinkedIn deep profile scrape disabled");
  }

  if (!config.whatsappToken || !config.whatsappPhoneNumberId) {
    console.warn("Warning: WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set — WhatsApp access disabled");
  }
}

validateConfig();
