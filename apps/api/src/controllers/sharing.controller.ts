import type { Context } from "hono";
import { z } from "zod";
import { createShareLink, validateShareLink } from "../services/sharing.service";
import { prisma } from "@repo/db";
import type { DocumentRole } from "../services/document.service";

const createShareLinkSchema = z.object({
  role: z.enum(["editor", "viewer"]).default("viewer"),
  expiresInDays: z.number().optional()
});

export async function createShareLinkController(c: Context) {
  try {
    const userRole = c.get("userRole") as DocumentRole;
    const documentId = c.req.param("id")!;

    // Phase 8 RBAC: Only Admin can create public links
    if (userRole !== "admin") {
      return c.json({ error: "Forbidden. Only administrators can manage public links." }, 403);
    }

    const json = await c.req.json();
    const body = createShareLinkSchema.parse(json);

    const shareLink = await createShareLink({
      documentId,
      role: body.role,
      expiresInDays: body.expiresInDays
    });

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const shareUrl = `${baseUrl}/documents/${documentId}?token=${shareLink.token}`;

    return c.json({ ...shareLink, url: shareUrl }, 201);
  } catch (error: any) {
    console.error(`[SHARE_LINK_500]`, error);
    return c.json({ error: "Failed to create share link" }, 500);
  }
}

export async function listShareLinksController(c: Context) {
  try {
    const userRole = c.get("userRole") as DocumentRole;
    const documentId = c.req.param("id")!;

    if (userRole !== "admin") {
      return c.json({ error: "Forbidden" }, 403);
    }

    const links = await prisma.shareLink.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" }
    });

    return c.json(links);
  } catch (error: any) {
    return c.json({ error: "Failed to list share links" }, 500);
  }
}

export async function deleteShareLinkController(c: Context) {
  try {
    const userRole = c.get("userRole") as DocumentRole;
    const documentId = c.req.param("id")!;
    const tokenId = c.req.param("tokenId")!;

    if (userRole !== "admin") {
      return c.json({ error: "Forbidden" }, 403);
    }

    await prisma.shareLink.delete({
      where: { id: tokenId, documentId }
    });

    return c.json({ ok: true });
  } catch (error: any) {
    return c.json({ error: "Failed to revoke share link" }, 500);
  }
}
