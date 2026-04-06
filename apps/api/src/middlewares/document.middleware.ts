import type { Context, Next } from "hono";
import { getDocumentForUser } from "../services/document.service";

/**
 * Middleware to verify if the user has access to the requested document.
 * Expects ':id' in the route params.
 */
export async function documentAccessMiddleware(c: Context, next: Next) {
  const user = c.get("user") as { sub: string } | undefined;
  const documentId = c.req.param("id");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!documentId) {
    return await next();
  }

  try {
    const doc = await getDocumentForUser(documentId, user.sub);
    
    if (!doc) {
      return c.json({ error: "Document not found or access denied" }, 404);
    }

    // Attach document and role to the context for use in controllers
    c.set("document", doc);
    
    await next();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connection')) {
      return c.json({ error: "Database unavailable" }, 503);
    }
    throw error;
  }
}
