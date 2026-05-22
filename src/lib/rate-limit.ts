import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter wrapper.
 *
 * Returns a no-op limiter if Upstash env vars are missing — useful for dev
 * without Redis. In production, ALWAYS set UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN.
 */

let redisClient: Redis | null = null;
function getRedis() {
  if (redisClient) return redisClient;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redisClient;
}

function noopLimiter() {
  return {
    limit: async () => ({
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now() + 60_000,
    }),
  };
}

function makeLimiter(name: string, requests: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  const redis = getRedis();
  if (!redis) return noopLimiter();
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: `lucarne:${name}`,
  });
}

// Pre-configured limiters per the plan
export const authLimiter = makeLimiter("auth", 5, "10 m");
export const betLimiter = makeLimiter("bet", 10, "1 m");
export const leagueLimiter = makeLimiter("league", 3, "1 h");
export const invitationLimiter = makeLimiter("invite", 20, "1 d");

/**
 * Get the IP address from a Request, accounting for common proxy headers.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
