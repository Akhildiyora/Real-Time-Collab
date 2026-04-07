import { Hono } from "hono";
import { authMiddleware } from "../middlewares/auth.middleware";
import { documentAccessMiddleware } from "../middlewares/document.middleware";
import { 
  addCollaborator, 
  createShareLink, 
  getCollaborators, 
  removeCollaborator,
  isRoleSufficient
} from "../services/sharing.service";

/**
 * Sharing & Permissions Router
 */
export const sharingRoutes = new Hono<{
  Variables: {
    user: { sub: string };
    userRole: string;
  };
}>();

// Auth and Access Middleware for all routes
sharingRoutes.use("*", authMiddleware);
sharingRoutes.use("*", documentAccessMiddleware);

/**
 * 1. SHARE with another user (Email)
 */
sharingRoutes.post("/", async (c) => {
  const user = c.get("user");
  const currentRole = c.get("userRole");
  const docId = c.req.param("id");
  const { email, role } = await c.req.json() as { email: string, role: string };

  if (!user || !currentRole || !docId) {
    return c.json({ error: "Missing context" }, 400);
  }

  // Only Admin or Admin-equivalent can share
  if (!isRoleSufficient(currentRole, "admin")) {
    return c.json({ error: "Insufficient permission" }, 403);
  }

  const result = await addCollaborator({
    documentId: docId,
    userEmail: email,
    role: role as any
  });

  if (result === "user_not_found") {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ success: true, collab: result.collab });
});

/**
 * 2. LIST Collaborators
 */
sharingRoutes.get("/collaborators", async (c) => {
  const docId = c.req.param("id");
  if (!docId) return c.json({ error: "Invalid ID" }, 400);
  
  const collabs = await getCollaborators(docId);
  return c.json(collabs);
});

/**
 * 3. CREATE Public Link
 */
sharingRoutes.post("/share-link", async (c) => {
  const currentRole = c.get("userRole");
  const docId = c.req.param("id");
  const { role, expiresInDays } = await c.req.json() as { role: string, expiresInDays?: number };

  if (!currentRole || !docId) {
    return c.json({ error: "Missing context" }, 400);
  }

  if (!isRoleSufficient(currentRole, "admin")) {
    return c.json({ error: "Insufficient permission" }, 403);
  }

  const link = await createShareLink({
    documentId: docId,
    role: role as any,
    expiresInDays
  });

  const origin = c.req.header("origin") || "http://localhost:5173";
  const url = `${origin}/document/${docId}?token=${link.token}`;

  return c.json({ url, token: link.token });
});

/**
 * 4. REMOVE Collaborator
 */
sharingRoutes.delete("/collaborators/:userId", async (c) => {
  const currentRole = c.get("userRole");
  const docId = c.req.param("id");
  const targetUserId = c.req.param("userId");

  if (!currentRole || !docId || !targetUserId) {
    return c.json({ error: "Missing context" }, 400);
  }

  if (!isRoleSufficient(currentRole, "admin")) {
    return c.json({ error: "Insufficient permission" }, 403);
  }

  await removeCollaborator(docId, targetUserId);
  return c.json({ success: true });
});
