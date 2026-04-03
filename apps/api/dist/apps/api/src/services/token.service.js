import jwt from "jsonwebtoken";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error("JWT_SECRET is not configured");
    return secret;
}
function getRefreshSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret)
        throw new Error("JWT_REFRESH_SECRET is not configured");
    return secret;
}
export function signAccessToken(payload) {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_TTL });
}
export function signRefreshToken(payload) {
    return jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_TTL });
}
export function verifyAccessToken(token) {
    return jwt.verify(token, getJwtSecret());
}
export function verifyRefreshToken(token) {
    return jwt.verify(token, getRefreshSecret());
}
