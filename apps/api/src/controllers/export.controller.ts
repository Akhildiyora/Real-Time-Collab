import type { Context } from "hono";
import { prisma } from "@repo/db";
import puppeteer from "puppeteer";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export async function exportPDFController(c: Context) {
  const documentId = c.req.param("id")!;
  
  try {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) return c.json({ error: "Document not found" }, 404);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; }
          h1 { font-size: 24pt; margin-bottom: 20px; }
          .content { font-size: 11pt; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${doc.title}</h1>
        <div class="content">${doc.content}</div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ 
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });
    await browser.close();

    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `attachment; filename="${doc.title}.pdf"`);
    return c.body(pdf.buffer as ArrayBuffer);
  } catch (error: any) {
    console.error("PDF Export Error:", error);
    return c.json({ error: "Failed to generate PDF" }, 500);
  }
}

export async function exportDOCXController(c: Context) {
  const documentId = c.req.param("id")!;

  try {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) return c.json({ error: "Document not found" }, 404);

    const wordDoc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: doc.title,
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: doc.content,
                  break: 1,
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(wordDoc);

    c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    c.header('Content-Disposition', `attachment; filename="${doc.title}.docx"`);
    return c.body(buffer.buffer as ArrayBuffer);
  } catch (error: any) {
    console.error("DOCX Export Error:", error);
    return c.json({ error: "Failed to generate DOCX" }, 500);
  }
}
