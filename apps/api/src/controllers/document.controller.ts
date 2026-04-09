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
    console.error("updateDocumentController Error:", error);
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
        title: 'Neural Engine v4 Roadmap — Q3 2024',
        content: 'Q3 Objectives:\n- Liquid state integration for sub-10ms latency\n- Vector secure handshake protocol v2\n- Neural mesh auto-scaling across 5 regions\n- Multi-tenant isolation at the kernel level\n\nKey milestones:\n1. Alpha release: July 15\n2. Beta rollout: August 30\n3. GA release: September 20\n\nRisks:\n- Yjs synchronization under extreme concurrent load\n- Redis cluster failover time exceeding 50ms SLA',
      },
      {
        title: 'System Architecture v2 — Distributed Design',
        content: 'Core Stack:\n- API: Hono on Node.js (ultra-fast Aho-Corasick routing)\n- Real-time Sync: Yjs CRDT with y-websocket bridge\n- Pub/Sub: Redis Streams for cross-instance broadcasting\n- Database: PostgreSQL with GIN index for full-text search\n- Auth: JWT with RS256 signing + refresh token rotation\n\nKey Design Decisions:\n1. WebSocket server separated from REST API for horizontal scaling\n2. Yjs state persisted as Bytes in Prisma with debounced writes (10s)\n3. Role-based access control enforced at middleware AND protocol level',
      },
      {
        title: 'Team Sync Minutes — April 2024',
        content: 'Meeting Date: April 9, 2024\nAttendees: Akhil (Lead), Neural Bot, Dev Team\n\nAgenda:\n1. Production deployment timeline\n2. Search indexing performance review\n3. RBAC audit for public share links\n\nAction Items:\n- [ ] Finalize FTS trigger on Document table\n- [ ] Add rate limiting to auth endpoints\n- [ ] Complete export to PDF/DOCX feature\n- [ ] Seed demo data for client presentation\n\nNext Meeting: April 16, 2024',
      },
      {
        title: 'Collaborative Editor — Feature Specification',
        content: 'Phase 1 — Core Collaboration:\n- Real-time cursor presence with user avatars\n- Operational transformation via Yjs CRDT\n- Conflict-free offline edits that merge on reconnect\n\nPhase 2 — Comments & Mentions:\n- Thread-anchored comments with @mention support\n- Inline comment highlights that track text positions\n- Email notifications for mentions\n\nPhase 3 — Export & Versioning:\n- PDF export with preserved formatting\n- DOCX export for Office compatibility\n- Version history with one-click restore\n\nPhase 4 — Security:\n- Viewer RBAC: read-only WebSocket enforcement\n- Share link expiry with configurable duration\n- Full audit log per document',
      },
      {
        title: 'Database Performance Analysis',
        content: 'Benchmark Results (April 2024):\n\n| Query | Before | After FTS | Improvement |\n|-------|--------|-----------|-------------|\n| Search "neural" | 450ms | 12ms | 37x faster |\n| Full document list | 120ms | 45ms | 2.7x faster |\n| Collaborator lookup | 80ms | 30ms | 2.7x faster |\n\nOptimizations Applied:\n- GIN index on search_vector column\n- Composite index on (ownerId, updatedAt)\n- Connection pooling via pg.Pool (max: 10)\n- Prisma query deduplication in middleware\n\nNext Steps:\n- Implement Redis caching for hot documents\n- Add read replicas for reporting queries',
      },
      {
        title: 'Security Audit Report — Q1 2024',
        content: 'Audit Scope: All API endpoints, WebSocket upgrade path, share links\n\nFindings:\n\n[CRITICAL - RESOLVED] JWT tokens leaked in URL query params\n→ Fix: Moved to Authorization header only\n\n[HIGH - RESOLVED] Viewer role could write via WebSocket protocol\n→ Fix: Protocol-level blocking of Sync Step 2 messages for viewers\n\n[MEDIUM - IN PROGRESS] Rate limiting not implemented on /auth/signup\n→ Action: Add redis-based rate limiter (50 req/min per IP)\n\n[LOW - ACCEPTED] CORS allows all localhost origins in development\n→ Action: Lock to specific origins in production\n\nOverall Security Score: B+ (target: A before GA)',
      },
      {
        title: 'Onboarding Guide — New Collaborators',
        content: 'Welcome to CollabX! Here is how to get started:\n\n1. Create your account at app.collabx.dev\n2. Create your first document using the "+ New Document" button\n3. Share with teammates: Open document → Share → Enter email → Choose role\n\nRoles Explained:\n- Admin: Full access including delete and share management\n- Editor: Can write and comment, cannot delete\n- Viewer: Read-only access, can leave comments\n\nReal-Time Features:\n- 🟢 Green badge = live WebSocket connection\n- 👥 Avatar stack = active collaborators in document\n- 💬 Speech bubble = open/close comment sidebar\n- 🕒 Clock = version history and restore\n\nKeyboard Shortcuts:\n- Ctrl+B: Bold | Ctrl+I: Italic | Ctrl+K: Link\n- Ctrl+Z: Undo | Ctrl+Shift+Z: Redo',
      },
      {
        title: 'Sprint Retrospective — March 2024',
        content: 'Sprint Duration: March 1–31, 2024\nVelocity: 48 points (target: 40)\n\nWhat Went Well:\n✅ Neural theme system shipped ahead of schedule\n✅ Full-text search reduced query time by 37x\n✅ Zero critical bugs in production for 2 weeks\n\nWhat Could Improve:\n⚠️ Too many mid-sprint priority switches disrupted focus\n⚠️ Integration testing started too late in cycle\n⚠️ Demo environment lagged 2 sprints behind production\n\nAction Items for Next Sprint:\n1. Code freeze 3 days before sprint end for testing\n2. Dedicated demo environment auto-sync pipeline\n3. Add load tests for WebSocket with 100 concurrent users',
      },
    ];

    let seeded = 0;
    for (const d of docs) {
      // Check if document with same title already exists for this user to prevent duplicates
      const existing = await prisma.document.findFirst({
        where: { title: d.title, ownerId: user.sub }
      });
      if (!existing) {
        await prisma.document.create({
          data: {
            title: d.title,
            content: d.content,
            ownerId: user.sub
          }
        });
        seeded++;
      }
    }

    return c.json({ success: true, seeded, total: docs.length });
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
