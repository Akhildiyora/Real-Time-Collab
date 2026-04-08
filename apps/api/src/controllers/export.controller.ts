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
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            padding: 40px; 
            color: #08060d; 
            line-height: 1.6; 
            background: #fff;
          }
          h1 { font-size: 28pt; margin-top: 0; margin-bottom: 20px; font-weight: 800; letter-spacing: -0.04em; }
          h2 { font-size: 18pt; margin-top: 30px; margin-bottom: 15px; font-weight: 700; }
          p { margin-bottom: 15px; }
          ul, ol { margin-bottom: 15px; padding-left: 20px; }
          li { margin-bottom: 5px; }
          blockquote { 
            border-left: 4px solid #9d17ff; 
            margin: 20px 0; 
            padding: 10px 20px; 
            background: #f9f8f6; 
            font-style: italic; 
          }
          code { 
            background: #f4f3ec; 
            padding: 2px 4px; 
            border-radius: 4px; 
            font-family: monospace; 
            color: #9d17ff;
          }
          strong { font-weight: 700; }
          em { font-style: italic; }
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
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        printBackground: true
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

    const children: any[] = [];

    // Simple HTML to DOCX conversion logic
    // We look for h1, h2, and p tags.
    const regex = /<(h1|h2|p|li).*?>(.*?)<\/\1>/gi;
    let match;
    let hasContent = false;

    while ((match = regex.exec(doc.content)) !== null) {
      const [, tag, innerHtml] = match;
      const cleanText = innerHtml.replace(/<[^>]*>?/gm, ''); // Strip nested tags for now
      
      if (tag.toLowerCase() === 'h1') {
        children.push(new Paragraph({ text: cleanText, heading: HeadingLevel.HEADING_1 }));
      } else if (tag.toLowerCase() === 'h2') {
        children.push(new Paragraph({ text: cleanText, heading: HeadingLevel.HEADING_2 }));
      } else {
        children.push(new Paragraph({ text: cleanText }));
      }
      hasContent = true;
    }

    // Fallback if no tags matched (e.g. legacy plain text)
    if (!hasContent) {
      children.push(
        new Paragraph({
          text: doc.title,
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          children: [new TextRun({ text: doc.content, break: 1 })],
        })
      );
    }

    const wordDoc = new Document({
      sections: [{ properties: {}, children }],
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
