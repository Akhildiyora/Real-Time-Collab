import { prisma } from "@repo/db";

export type DocumentRole = "admin" | "editor" | "viewer";

export async function createDocument(params: {
  ownerId: string;
  title: string;
  content?: string;
  yjsState?: Buffer;
}) {
  const doc = await prisma.document.create({
    data: {
      title: params.title,
      content: params.content ?? "",
      yjsState: params.yjsState as any,
      ownerId: params.ownerId,
      versions: {
        create: {
          content: params.content ?? "",
          version: 1,
        },
      },
      activities: {
        create: {
          userId: params.ownerId,
          action: "DOCUMENT_CREATED",
        },
      },
    },
  });
  return doc;
}

export async function getDocumentsForUser(userId: string) {
  return prisma.document.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDocumentForUser(documentId: string, userId: string) {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
    },
    include: {
      collaborators: true,
      owner: {
        select: { id: true, email: true }
      }
    },
  });
}

/**
 * Enhanced document access check for RBAC support.
 */
export async function getDocumentAccess(documentId: string, userId: string): Promise<{ role: DocumentRole } | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      ownerId: true,
      collaborators: {
        where: { userId },
        select: { role: true }
      }
    }
  });

  if (!doc) return null;

  if (doc.ownerId === userId) return { role: "admin" };

  const collab = doc.collaborators[0];
  if (collab) return { role: collab.role as DocumentRole };

  return null;
}

export async function updateDocumentForUser(params: {
  documentId: string;
  userId: string;
  title?: string;
  content?: string;
  yjsState?: Buffer;
}) {
  const access = await getDocumentAccess(params.documentId, params.userId);
  if (!access) return null;

  // Verbatim Phase 8: Only "admin" and "editor" can commit updates
  if (access.role === "viewer") return "forbidden" as const;

  const existing = await prisma.document.findUnique({ where: { id: params.documentId } });
  if (!existing) return null;

  const nextVersionNumber =
    (await prisma.documentVersion.count({
      where: { documentId: params.documentId },
    })) + 1;

  const updated = await prisma.document.update({
    where: { id: params.documentId },
    data: {
      title: params.title ?? existing.title,
      content: params.content ?? existing.content,
      yjsState: params.yjsState ?? (existing.yjsState as any),
      versions: params.content
        ? {
            create: {
              content: params.content,
              version: nextVersionNumber,
            },
          }
        : undefined,
      activities: {
        create: {
          userId: params.userId,
          action: "DOCUMENT_UPDATED",
        },
      },
    },
  });

  return updated;
}

export async function deleteDocumentForUser(documentId: string, userId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return null;
  if (doc.ownerId !== userId) return "forbidden" as const;

  // Log the deletion BEFORE removing the document to ensure the foreign key (if required) is valid
  // or simply log the event without the documentId if the record is gone.
  await prisma.activityLog.create({
    data: {
      userId,
      documentId: null, // Set to null since the document is being erased
      action: "DOCUMENT_DELETED",
      metadata: { deletedDocumentId: documentId, title: doc.title }
    },
  });

  await prisma.document.delete({ where: { id: documentId } });

  return true;
}

export async function setDocumentCollaborator(params: {
  documentId: string;
  ownerId: string;
  collaboratorUserId: string;
  role: DocumentRole;
}) {
  const doc = await prisma.document.findUnique({ where: { id: params.documentId } });
  if (!doc) return null;
  if (doc.ownerId !== params.ownerId) return "forbidden" as const;

  const collab = await prisma.documentCollaborator.upsert({
    where: {
      documentId_userId: {
        documentId: params.documentId,
        userId: params.collaboratorUserId,
      },
    },
    update: { role: params.role },
    create: {
      documentId: params.documentId,
      userId: params.collaboratorUserId,
      role: params.role,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: params.ownerId,
      documentId: params.documentId,
      action: "DOCUMENT_SHARED",
      metadata: {
        collaboratorUserId: params.collaboratorUserId,
        role: params.role,
      },
    },
  });

  return collab;
}

export async function getDocumentVersions(documentId: string, userId: string) {
  const doc = await getDocumentForUser(documentId, userId);
  if (!doc) return null;

  return prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { version: "desc" },
  });
}
