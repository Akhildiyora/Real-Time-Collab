import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { googleOAuthController, refreshController, signInController, signUpController, } from "../controllers/auth.controller";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware";
const signUpSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});
const signInSchema = signUpSchema;
const refreshSchema = z.object({ refreshToken: z.string().min(1) });
const googleOAuthSchema = z.object({ idToken: z.string().min(1) });
export const authRoutes = new Hono();
authRoutes.post("/signup", zValidator("json", signUpSchema), signUpController);
authRoutes.post("/signin", zValidator("json", signInSchema), signInController);
authRoutes.post("/refresh", zValidator("json", refreshSchema), refreshController);
authRoutes.post("/google", zValidator("json", googleOAuthSchema), googleOAuthController);
authRoutes.get("/me", authMiddleware, (c) => c.json({ user: c.get("user") }));
authRoutes.get("/admin", authMiddleware, requireRole("ADMIN"), (c) => c.json({ ok: true, role: "ADMIN" }));
