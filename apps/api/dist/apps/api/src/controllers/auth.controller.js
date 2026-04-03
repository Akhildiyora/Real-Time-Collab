import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { redis } from "../redis";
import { createUser, getUserByEmail, verifyPassword } from "../services/user.service";
import { signAccessToken, signRefreshToken, verifyRefreshToken, } from "../services/token.service";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
function tokenPayload(user) {
    return { sub: user.id, email: user.email, role: user.role };
}
export async function signUpController(c) {
    const { email, password } = await c.req.json();
    const existing = await getUserByEmail(email);
    if (existing)
        return c.json({ error: "User already exists" }, 409);
    const user = await createUser(email, password);
    return c.json({ id: user.id, email: user.email }, 201);
}
export async function signInController(c) {
    const { email, password } = await c.req.json();
    const user = await getUserByEmail(email);
    if (!user)
        return c.json({ error: "Invalid credentials" }, 401);
    const ok = await verifyPassword(password, user.password);
    if (!ok)
        return c.json({ error: "Invalid credentials" }, 401);
    const payload = tokenPayload(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await redis.set(`refresh:${user.id}`, refreshToken, "EX", 60 * 60 * 24 * 7);
    return c.json({ accessToken, refreshToken });
}
export async function refreshController(c) {
    const { refreshToken } = await c.req.json();
    const payload = verifyRefreshToken(refreshToken);
    const stored = await redis.get(`refresh:${payload.sub}`);
    if (!stored || stored !== refreshToken)
        return c.json({ error: "Invalid refresh token" }, 401);
    const accessToken = signAccessToken(payload);
    return c.json({ accessToken });
}
export async function googleOAuthController(c) {
    const { idToken } = await c.req.json();
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const googlePayload = ticket.getPayload();
    if (!googlePayload?.email)
        return c.json({ error: "Google email missing" }, 400);
    let user = await getUserByEmail(googlePayload.email);
    if (!user) {
        user = await createUser(googlePayload.email, crypto.randomUUID());
    }
    const payload = tokenPayload(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await redis.set(`refresh:${user.id}`, refreshToken, "EX", 60 * 60 * 24 * 7);
    return c.json({ accessToken, refreshToken });
}
