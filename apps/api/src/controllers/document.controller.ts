import type { Context } from "hono";
import { z } from "zod";
import {
  createDocument,
  deleteDocumentForUser,
  getDocumentForUser,
  getDocumentsForUser,
  setDocumentCollaborator,
  updateDocumentForUser,
  getDocumentVersions,
  getDocumentAccess,
  type DocumentRole
} from "../services/document.service";
import { prisma } from "@repo/db";

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().default(""),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  yjsState: z.string().optional(), // Base64 encoded update
});

const shareSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
});

export async function listDocumentsController(c: Context) {
  try {
    const user = c.get("user") as { sub: string };
    const docs = await getDocumentsForUser(user.sub);
    return c.json(docs);
  } catch (error: any) {
    return c.json({ error: "Failed to list documents" }, 500);
  }
}

export async function createDocumentController(c: Context) {
  try {
    const user = c.get("user") as { sub: string } | undefined;
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const json = await c.req.json();
    const body = createSchema.parse(json);

    const doc = await createDocument({
      ownerId: user.sub,
      title: body.title,
      content: body.content,
    });

    return c.json(doc, 201);
  } catch (error: any) {
    return c.json({ error: "Failed to create document" }, 500);
  }
}

export async function getDocumentController(c: Context) {
  try {
    const documentId = c.req.param("id")!;
    const userRole = c.get("userRole") as DocumentRole;
    const user = c.get("user") as { sub: string } | undefined;

    // Use prisma directly here to support Guest/Token access which doesn't rely solely on userId
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        owner: { select: { id: true, email: true } },
        collaborators: {
          select: { role: true, user: { select: { email: true } } }
        }
      }
    });

    if (!doc) return c.json({ error: "Not found" }, 404);

    // Phase 10: Log view event
    if (user?.sub) {
      await prisma.activityLog.create({
        data: {
          userId: user.sub,
          documentId: documentId,
          action: "DOCUMENT_VIEWED",
        }
      }).catch(err => console.error("Failed to log view event:", err));
    }

    return c.json({
      ...doc,
      currentUserRole: userRole
    });
  } catch (error: any) {
    return c.json({ error: "Failed to fetch document" }, 500);
  }
}

export async function getDocumentAuditLogsController(c: Context) {
  try {
    const documentId = c.req.param("id")!;
    const userRole = c.get("userRole") as DocumentRole;

    // Only Admin/Owner should see full audit logs? 
    // Or anyone with access? User's prompt implies "Structure activity tracking for compliance".
    // Usually implies at least Editor/Admin.
    if (userRole === "viewer") {
      return c.json({ error: "Forbidden. Only editors can view audit logs." }, 403);
    }

    const logs = await prisma.activityLog.findMany({
      where: { documentId },
      include: {
        user: { select: { id: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100 // Pagination limit
    });

    return c.json(logs);
  } catch (error: any) {
    return c.json({ error: "Failed to fetch audit logs" }, 500);
  }
}

export async function updateDocumentController(c: Context) {
  try {
    const userRole = c.get("userRole") as DocumentRole;
    const documentId = c.req.param("id")!;
    const user = c.get("user") as { sub: string } | undefined;

    // Phase 8 RBAC: Only Editor or Admin can update
    if (userRole === "viewer") {
      return c.json({ error: "Read-only access. Cannot update document." }, 403);
    }

    const json = await c.req.json();
    const body = updateSchema.parse(json);

    const yjsStateBuffer = body.yjsState 
      ? Buffer.from(body.yjsState, 'base64')
      : undefined;

    // If it's a guest update (via token), use a system context or the token role
    // For now, most updates are via authenticated users
    const result = await updateDocumentForUser({
      documentId,
      userId: user?.sub || "guest", // Support guest updates if the role is correct
      title: body.title,
      content: body.content,
      yjsState: yjsStateBuffer,
    });

    if (result === null) return c.json({ error: "Not found" }, 404);
    if (result === "forbidden") return c.json({ error: "Forbidden" }, 403);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: "Failed to update document" }, 500);
  }
}

export async function deleteDocumentController(c: Context) {
  try {
    const userRole = c.get("userRole") as DocumentRole;
    const documentId = c.req.param("id")!;
    const user = c.get("user") as { sub: string } | undefined;

    // Phase 8 RBAC: Only Admin can delete
    if (userRole !== "admin") {
      return c.json({ error: "Forbidden. Only administrators can delete documents." }, 403);
    }

    const result = await deleteDocumentForUser(documentId, user?.sub || "");
    if (result === null) return c.json({ error: "Not found" }, 404);
    if (result === "forbidden") return c.json({ error: "Forbidden" }, 403);
    return c.json({ ok: true });
  } catch (error: any) {
    return c.json({ error: "Failed to delete document" }, 500);
  }
}

// Removed duplicated shareSchema

export async function shareDocumentController(c: Context) {
  try {
    const userRole = c.get("userRole") as DocumentRole;
    const user = c.get("user") as { sub: string } | undefined;
    const documentId = c.req.param("id")!;

    // Phase 8 RBAC: Only Admin can manage collaborators
    if (userRole !== "admin") {
      return c.json({ error: "Forbidden. Only administrators can share documents." }, 403);
    }

    const { addCollaborator } = await import("../services/sharing.service");
    const json = await c.req.json();
    const body = shareSchema.parse(json);

    const result = await addCollaborator({
      documentId,
      userEmail: body.email,
      role: body.role as DocumentRole,
    });

    if (result === "user_not_found") {
      return c.json({ error: "User not found with that email." }, 404);
    }

    return c.json({ success: true, collaborator: result.collab });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.issues }, 400);
    }
    console.error("Sharing error:", error);
    return c.json({ error: "Failed to share document" }, 500);
  }
}

export async function searchDocumentsController(c: Context) {
  try {
    const user = c.get("user") as { sub: string };
    const query = c.req.query("q");
    if (!query) return c.json([]);

    // PostgreSQL Full-Text Search with access control
    // Rank results by relevance
    // Use a subquery or strict grouping for all selected columns from d.*
    const docs = await prisma.$queryRaw`
      SELECT d.id, d.title, d.content, d."ownerId", d."createdAt", d."updatedAt",
             ts_rank(d.search_vector, plainto_tsquery('english', ${query})) as rank
      FROM "Document" d
      LEFT JOIN "DocumentCollaborator" c ON d.id = c."documentId"
      WHERE d.search_vector @@ plainto_tsquery('english', ${query})
      AND (d."ownerId" = ${user.sub} OR c."userId" = ${user.sub})
      ORDER BY rank DESC
      LIMIT 30
    `;

    return c.json(docs);
  } catch (error: any) {
    console.error("Search error:", error);
    return c.json({ error: "Failed to search documents", details: error.message }, 500);
  }
}

export async function seedDocumentsController(c: Context) {
  try {
    const user = c.get("user") as { sub: string };
    const docs = [
      {
        title: 'Neural Roadmap 2024',
        content: 'Focus on production stabilization and FTS indexing.',
      },
      {
        title: 'System Architecture v2',
        content: 'Using Yjs and Hono with Redis bridge.',
      },
      {
        title: 'Team Sync Minutes',
        content: 'Collaborators verified the export functionality.',
      }
    ];

    for (const d of docs) {
      await prisma.document.create({
        data: {
          title: d.title,
          content: d.content,
          ownerId: user.sub
        }
      });
    }

    return c.json({ success: true, seeded: docs.length });
  } catch (error: any) {
    return c.json({ error: "Failed to seed", details: error.message }, 500);
  }
}

export async function listVersionsController(c: Context) {
  try {
    const documentId = c.req.param("id")!;

    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: "desc" },
    });

    return c.json(versions);
  } catch (error: any) {
    return c.json({ error: "Failed to list versions" }, 500);
  }
}
