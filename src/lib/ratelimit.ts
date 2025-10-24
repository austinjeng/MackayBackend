import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// The fromEnv method automatically reads the UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// from your .env file.
const redis = Redis.fromEnv();

// Create a new ratelimiter, that allows 10 requests per 10 seconds.
export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "10 s"),
  analytics: true, // Enable analytics to see usage patterns in the Upstash console
  /**
   * Optional prefix for the keys used in Redis.
   * This is useful if you want to share a Redis instance with other applications.
   */
  prefix: "mackay_backend_ratelimit",
});
