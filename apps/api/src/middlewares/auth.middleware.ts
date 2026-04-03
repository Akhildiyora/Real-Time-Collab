import type { MiddlewareHandler } from "hono";
import { verifyAccessToken } from "../services/token.service";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  try {
    const payload = verifyAccessToken(token);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
};

export const requireRole = (role: "USER" | "ADMIN"): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get("user") as { role?: string } | undefined;
    if (!user?.role) return c.json({ error: "Unauthorized" }, 401);
    if (user.role !== role) return c.json({ error: "Forbidden" }, 403);
    await next();
  };
};
