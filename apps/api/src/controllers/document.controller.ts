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
} from "../services/document.service";

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().default(""),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
});

const shareSchema = z.object({
  collaboratorUserId: z.string().uuid(),
  role: z.enum(["owner", "editor", "viewer"]).default("editor"),
});

export async function listDocumentsController(c: Context) {
  try {
    const user = c.get("user") as { sub: string };
    const docs = await getDocumentsForUser(user.sub);
    return c.json(docs);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connection')) {
      return c.json({ error: "Database unavailable. Please check if PostgreSQL is running." }, 503);
    }
    throw error;
  }
}

export async function createDocumentController(c: Context) {
  try {
    const user = c.get("user") as { sub: string } | undefined;
    const json = await c.req.json();
    const body = createSchema.parse(json);

    const doc = await createDocument({
      ownerId: user!.sub,
      title: body.title,
      content: body.content,
    });

    return c.json(doc, 201);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connection')) {
      return c.json({ error: "Database unavailable. Please check if PostgreSQL is running." }, 503);
    }
    throw error;
  }
}

export async function getDocumentController(c: Context) {
  try {
    const user = c.get("user") as { sub: string };
    const id = c.req.param("id")!;

    const doc = await getDocumentForUser(id, user!.sub);
    if (!doc) return c.json({ error: "Not found" }, 404);
    return c.json(doc);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connection')) {
      return c.json({ error: "Database unavailable. Please check if PostgreSQL is running." }, 503);
    }
    throw error;
  }
}

export async function updateDocumentController(c: Context) {
  const user = c.get("user") as { sub: string };
  const id = c.req.param("id")!;
  const json = await c.req.json();
  const body = updateSchema.parse(json);

  const result = await updateDocumentForUser({
    documentId: id,
    userId: user.sub,
    title: body.title,
    content: body.content,
  });

  if (result === null) return c.json({ error: "Not found" }, 404);
  if (result === "forbidden") return c.json({ error: "Forbidden" }, 403);
  return c.json(result);
}

export async function deleteDocumentController(c: Context) {
  const user = c.get("user") as { sub: string };
  const id = c.req.param("id")!;

  const result = await deleteDocumentForUser(id, user!.sub);
  if (result === null) return c.json({ error: "Not found" }, 404);
  if (result === "forbidden") return c.json({ error: "Forbidden" }, 403);
  return c.json({ ok: true });
}

export async function shareDocumentController(c: Context) {
  const user = c.get("user") as { sub: string };
  const id = c.req.param("id")!;
  const json = await c.req.json();
  const body = shareSchema.parse(json);

  const result = await setDocumentCollaborator({
    documentId: id,
    ownerId: user.sub,
    collaboratorUserId: body.collaboratorUserId,
    role: body.role,
  });

  if (result === null) return c.json({ error: "Not found" }, 404);
  if (result === "forbidden") return c.json({ error: "Forbidden" }, 403);
  return c.json(result);
}

export async function listVersionsController(c: Context) {
  const user = c.get("user") as { sub: string };
  const id = c.req.param("id")!;

  const versions = await getDocumentVersions(id, user.sub);
  if (versions === null) return c.json({ error: "Not found" }, 404);
  return c.json(versions);
}
