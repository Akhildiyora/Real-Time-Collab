import { prisma } from "@repo/db";
import crypto from "node:crypto";

export type DocumentRole = "admin" | "editor" | "viewer";

/**
 * Creates or updates a collaborator for a document.
 */
export async function addCollaborator(params: {
  documentId: string;
  userEmail: string;
  role: DocumentRole;
}) {
  const user = await prisma.user.findUnique({
    where: { email: params.userEmail },
    select: { id: true, email: true }
  });

  if (!user) return "user_not_found" as const;

  const collab = await prisma.documentCollaborator.upsert({
    where: {
      documentId_userId: {
        documentId: params.documentId,
        userId: user.id,
      },
    },
    update: { role: params.role },
    create: {
      documentId: params.documentId,
      userId: user.id,
      role: params.role,
    },
  });

  return { collab, user };
}

/**
 * Generates a persistent public share link (Option 2 - Token based).
 */
export async function createShareLink(params: {
  documentId: string;
  role: "editor" | "viewer";
  expiresInDays?: number;
}) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = params.expiresInDays 
    ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  return prisma.shareLink.create({
    data: {
      documentId: params.documentId,
      token,
      role: params.role,
      expiresAt
    }
  });
}

/**
 * Validates a share token and returns the role it grants for the document.
 */
export async function validateShareLink(token: string) {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      document: {
        select: { id: true, title: true }
      }
    }
  });

  if (!link) return null;

  if (link.expiresAt && link.expiresAt < new Date()) {
    return "expired" as const;
  }

  return {
    documentId: link.documentId,
    role: link.role,
    document: link.document
  };
}

/**
 * Returns all collaborators for a document.
 */
export async function getCollaborators(documentId: string) {
  return prisma.documentCollaborator.findMany({
    where: { documentId },
    include: {
      user: {
        select: { id: true, email: true }
      }
    }
  });
}

/**
 * Removes a collaborator.
 */
export async function removeCollaborator(documentId: string, userId: string) {
  return prisma.documentCollaborator.deleteMany({
    where: { documentId, userId }
  });
}

/**
 * Updates a collaborator's role.
 */
export async function updateCollaboratorRole(params: {
  documentId: string;
  userId: string;
  role: DocumentRole;
}) {
  return prisma.documentCollaborator.update({
    where: {
      documentId_userId: {
        documentId: params.documentId,
        userId: params.userId,
      },
    },
    data: { role: params.role },
  });
}

/**
 * Helper to check if a user has sufficient role level.
 */
export function isRoleSufficient(currentRole: string, requiredRole: DocumentRole): boolean {
  const levels: Record<string, number> = {
    "admin": 3,
    "editor": 2,
    "viewer": 1
  };
  
  return (levels[currentRole] ?? 0) >= (levels[requiredRole] ?? 0);
}
