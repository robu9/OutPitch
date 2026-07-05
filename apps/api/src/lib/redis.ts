import IORedis from "ioredis";
import { config } from "../config.js";

function redisOptions(maxRetriesPerRequest: number | null = null) {
  const url = config.redisUrl;
  return {
    maxRetriesPerRequest,
    ...(url.startsWith("rediss://") && { tls: {} }),
  };
}

export function createRedisClient(maxRetriesPerRequest: number | null = null) {
  return new IORedis(config.redisUrl, redisOptions(maxRetriesPerRequest));
}

export function getQueueConnection() {
  return createRedisClient(null);
}

// Shared client for general app use (idempotency keys, etc.), lazily created.
let sharedClient: IORedis | null = null;
function getSharedRedis(): IORedis | null {
  if (!config.redisUrl) return null;
  if (!sharedClient) {
    sharedClient = createRedisClient(null);
    sharedClient.on("error", (e) => console.warn("Redis (shared) error:", e.message));
  }
  return sharedClient;
}

// In-memory fallback dedup set (bounded) when Redis isn't configured.
const seenKeys = new Set<string>();

/**
 * Returns true the FIRST time a key is seen, false on repeats (within the TTL
 * for Redis, or process lifetime for the in-memory fallback). Used to make
 * webhook processing idempotent against provider retries.
 */
export async function markProcessedOnce(key: string, ttlSeconds = 3600): Promise<boolean> {
  const client = getSharedRedis();
  if (client) {
    try {
      const res = await client.set(key, "1", "EX", ttlSeconds, "NX");
      return res === "OK";
    } catch (e) {
      console.warn("markProcessedOnce Redis failed, falling back to memory:", e);
    }
  }
  if (seenKeys.has(key)) return false;
  seenKeys.add(key);
  if (seenKeys.size > 5000) seenKeys.clear(); // crude bound
  return true;
}
