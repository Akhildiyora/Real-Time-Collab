

import mammoth from "mammoth";
import { prisma } from "@repo/db";

export async function processUpload(file: File, userId: string): Promise<any> {
  const buffer = Buffer.from(await file.arrayBuffer());
  let content = "";
  const title = file.name.replace(/\.[^/.]+$/, "");

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx") || file.name.endsWith(".doc")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    content = result.value;
  } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    content = buffer.toString("utf-8");
  } else {
    throw new Error("Unsupported file type. Please upload a .docx (Microsoft Word) file to preserve semantic layout structure.");
  }

  // Heuristic formatting: Reconstruct Document Structure from Raw Text
  const rawLines = content.split('\n');
  let htmlBlocks: string[] = [];
  let currentParagraph: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    
    if (line.length === 0) {
      // Empty line signals the end of the current paragraph block
      if (currentParagraph.length > 0) {
        htmlBlocks.push(`<p>${currentParagraph.join('<br>')}</p>`);
        currentParagraph = [];
      }
    } else {
      // Stricter Heading Guard: Must be short, not an email, not a URL, and mostly capitalized or distinct
      const isEmailOrUrl = line.includes('@') || line.includes('http') || line.includes('.com') || line.includes('www.');
      
      if (!isEmailOrUrl && line.length < 50 && line.length > 2 && currentParagraph.length === 0 && (i === rawLines.length - 1 || rawLines[i+1].trim().length === 0)) {
        htmlBlocks.push(`<h2>${line}</h2>`);
      } else if (line.match(/^(\d+\.|[•\-\*])\s+/)) {
        // Simple list item detection
        if (currentParagraph.length > 0) {
           htmlBlocks.push(`<p>${currentParagraph.join('<br>')}</p>`);
           currentParagraph = [];
        }
        htmlBlocks.push(`<ul><li>${line.replace(/^(\d+\.|[•\-\*])\s+/, '')}</li></ul>`);
      } else {
        currentParagraph.push(line);
      }
    }
  }
  
  if (currentParagraph.length > 0) {
    htmlBlocks.push(`<p>${currentParagraph.join('<br>')}</p>`);
  }

  const htmlContent = htmlBlocks.join('\n');

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
