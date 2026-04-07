import type { MiddlewareHandler } from "hono";
import { redis } from "../redis";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export const rateLimit = (options: RateLimitOptions): MiddlewareHandler => {
  return async (c, next) => {
    // Get IP address (handling proxies)
    const ip = c.req.header("x-forwarded-for")?.split(",")[0] || "local";
    const key = `ratelimit:${ip}:${c.req.path}`;

    try {
      const count = await redis.incr(key);

      if (count === 1) {
        // Set expiry on first request in the window
        await redis.pexpire(key, options.windowMs);
      }

      if (count > options.max) {
        return c.json(
          {
            error: "Too many requests",
            message: "Slow down your neural link. Rate limit exceeded.",
            retryAfterMs: await redis.pttl(key),
          },
          429
        );
      }

      await next();
    } catch (error) {
      // Fail open to avoid blocking users if Redis is down
      console.error("Rate Limit Redis Error:", error);
      await next();
    }
  };
};
