import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { prisma } from "@repo/db";

import * as Y from "yjs";

export async function processUpload(file: File, userId: string): Promise<any> {
  const buffer = Buffer.from(await file.arrayBuffer());
  let content = "";
  const title = file.name.replace(/\.[^/.]+$/, "");

  if (file.type === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    content = result.text;
    await parser.destroy();
  } else if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    content = result.value;
  } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    content = buffer.toString("utf-8");
  } else {
    throw new Error("Unsupported file type");
  }

  // Create the document
  const document = await prisma.document.create({
    data: {
      title: title || "Uploaded Document",
      content: content, // Save HTML/Text. The frontend will sync this into Yjs on first load
      ownerId: userId,
    },
  });

  return document;
}
