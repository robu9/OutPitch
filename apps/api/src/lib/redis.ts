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
