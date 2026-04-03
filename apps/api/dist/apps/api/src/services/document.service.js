import { prisma } from "../../../../packages/db/src/index";
export async function createDocument(params) {
    const doc = await prisma.document.create({
        data: {
            title: params.title,
            content: params.content,
            ownerId: params.ownerId,
            versions: {
                create: {
                    content: params.content,
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
export async function getDocumentForUser(documentId, userId) {
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
export async function updateDocumentForUser(params) {
    const existing = await getDocumentForUser(params.documentId, params.userId);
    if (!existing)
        return null;
    const canEdit = existing.ownerId === params.userId ||
        existing.collaborators.some((c) => c.userId === params.userId && c.role !== "viewer");
    if (!canEdit)
        return "forbidden";
    const nextVersionNumber = (await prisma.documentVersion.count({
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
export async function deleteDocumentForUser(documentId, userId) {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc)
        return null;
    if (doc.ownerId !== userId)
        return "forbidden";
    await prisma.document.delete({ where: { id: documentId } });
    await prisma.activityLog.create({
        data: {
            userId,
            documentId,
            action: "DOCUMENT_DELETED",
        },
    });
    return true;
}
export async function setDocumentCollaborator(params) {
    const doc = await prisma.document.findUnique({ where: { id: params.documentId } });
    if (!doc)
        return null;
    if (doc.ownerId !== params.ownerId)
        return "forbidden";
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
