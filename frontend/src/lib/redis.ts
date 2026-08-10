import { env } from "./env";

let redisClient: import("ioredis").Redis | null = null;

export async function getRedisClient() {
  if (redisClient) return redisClient;
  if (!env.redisUrl) return null;

  const { Redis } = await import("ioredis");
  redisClient = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on("error", (err) => {
    console.error("[Redis] Error:", err.message);
  });

  return redisClient;
}
