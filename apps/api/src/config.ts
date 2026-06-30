import "dotenv/config";

export const config = {
  port: parseInt(process.env.API_PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  cogneeApiUrl: process.env.COGNEE_API_URL ?? "http://localhost:8000",
  cogneeServiceToken: process.env.COGNEE_SERVICE_TOKEN ?? "",
  composioApiKey: process.env.COMPOSIO_API_KEY ?? "",
  serpApiKey: process.env.SERPAPI_KEY ?? "",
  apolloApiKey: process.env.APOLLO_API_KEY ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET ?? "",
};

function validateConfig() {
  const required = ["DATABASE_URL"] as const;
  for (const key of required) {
    if (!process.env[key]) {
      console.warn(`Warning: ${key} is not set`);
    }
  }
}

validateConfig();
