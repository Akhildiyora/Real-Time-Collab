import type { Context } from "hono";
import { processUpload } from "../services/upload.service";

export async function uploadDocumentController(c: Context) {
  try {
    const user = c.get("user") as { sub: string } | undefined;
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.parseBody();
    const file = body.file as File;

    if (!file) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    const document = await processUpload(file, user.sub);

    return c.json(document, 201);
  } catch (error: any) {
    console.error("Upload error:", error);
    return c.json({ error: error.message || "Failed to upload document" }, 500);
  }
}
