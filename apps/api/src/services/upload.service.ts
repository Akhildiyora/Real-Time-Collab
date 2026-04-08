import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { prisma } from "@repo/db";

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

  // Convert plain text to HTML paragraphs for rich export (PDF/DOCX)
  const htmlContent = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => `<p>${line}</p>`)
    .join('');

  // Create the document
  const document = await prisma.document.create({
    data: {
      title: title || "Uploaded Document",
      content: htmlContent || `<p>${content}</p>`,
      ownerId: userId,
    },
  });

  return document;
}
