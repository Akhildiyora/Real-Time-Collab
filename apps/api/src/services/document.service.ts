import { prisma } from "@repo/db";

export type DocumentRole = "owner" | "editor" | "viewer";

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
    },
  });
}

export async function updateDocumentForUser(params: {
  documentId: string;
  userId: string;
  title?: string;
  content?: string;
}) {
  const existing = await getDocumentForUser(params.documentId, params.userId);
  if (!existing) return null;

  const canEdit =
    existing.ownerId === params.userId ||
    existing.collaborators.some((c) => c.userId === params.userId && c.role !== "viewer");
  if (!canEdit) return "forbidden" as const;

  const nextVersionNumber =
    (await prisma.documentVersion.count({
      where: { documentId: params.documentId },
    })) + 1;

  const updated = await prisma.document.update({
    where: { id: params.documentId },
    data: {
      title: params.title ?? existing.title,
      content: params.content ?? existing.content,
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
