import { PrismaClient } from './generated/prisma';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Neural Collaborative Documents...');

  // 1. Get an existing user (assuming admin or first user exists)
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('❌ No user found. Please sign up first.');
    return;
  }

  const documents = [
    {
      title: 'Neural Engine v4 Roadmap',
      content: '## Q3 Roadmap\n- Liquid state integration\n- Latency reduction to < 10ms\n- Vector secure handshake protocol',
    },
    {
      title: 'Global Team Meeting - April',
      content: 'Attendees: Akhil, NeuralBot, Team.\nDiscussing the final production release of the Collab Editor.',
    },
    {
      title: 'Architectural System Design',
      content: 'Using Hono for the API and Yjs for core state synchronization. PostgreSQL full-text search integrated via GIN indexes.',
    },
    {
      title: 'Project Alpha Requirements',
      content: '1. Real-time feedback via Neural sidebar\n2. Secure sharing with email invitations\n3. PDF/DOCX multi-format export',
    },
    {
      title: 'Maintenance Log 2024',
      content: 'Critical patch applied for Yjs decoding stability. Search parameters optimized for rank sorting.',
    }
  ];

  for (const doc of documents) {
    const created = await prisma.document.create({
      data: {
        title: doc.title,
        content: doc.content,
        ownerId: user.id
      }
    });
    console.log(`✅ Created: ${created.title}`);
  }

  console.log('🚀 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
