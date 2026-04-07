import type { Context, Next } from "hono";
import { getDocumentForUser, getDocumentAccess, type DocumentRole } from "../services/document.service";
import { validateShareLink } from "../services/sharing.service";

/**
 * Middleware to verify if the user has access to the requested document.
 * Supports RBAC and Public Share Tokens.
 */
export async function documentAccessMiddleware(c: Context, next: Next) {
  const user = c.get("user") as { sub: string } | undefined;
  const documentId = c.req.param("id");
  const token = c.req.query("token");

  if (!documentId) {
    return await next();
  }

  try {
    const docId = documentId;
    let role: DocumentRole | null = null;
    let isPublic = false;
    let currentUser = user;

    // 1. If not already authenticated, try to extract user from header (Optional Auth)
    // This allows the middleware to know WHO is requesting even if we aren't forcing auth yet
    if (!currentUser) {
      const authHeader = c.req.header("Authorization");
      const jwtToken = authHeader?.replace("Bearer ", "");
      if (jwtToken) {
        try {
          const payload = await import("../services/token.service").then(m => m.verifyAccessToken(jwtToken));
          currentUser = payload as any;
          c.set("user", currentUser); // Set it for subsequent controllers
        } catch (e) {
          // Token invalid, ignore it (could be an old token while using a share link)
        }
      }
    }

    // 2. Check for Public Share Token first
    if (token) {
      const shareResult = await validateShareLink(token);
      if (shareResult && shareResult !== "expired" && shareResult.documentId === docId) {
        role = shareResult.role as DocumentRole;
        isPublic = true;
      }
    }

    // 3. If no valid token, check authenticated user access
    if (!role && currentUser) {
      const access = await getDocumentAccess(docId, currentUser.sub);
      if (access) {
        role = access.role;
      }
    }

    // 4. Deny if neither token nor user has access
    if (!role) {
      console.warn(`[ACCESS_DENIED] docId: ${docId}, userId: ${currentUser?.sub}, hasToken: ${!!token}, origin: ${c.req.url}`);
      return c.json({ error: "Access denied. Document not found or insufficient permissions." }, 403);
    }

    // 4. Attach to context
    c.set("documentId", documentId);
    c.set("userRole", role);
    c.set("isPublic", isPublic);
    
    await next();
  } catch (error: any) {
    console.error("Document access middleware error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
}
