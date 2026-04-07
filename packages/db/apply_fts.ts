import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  const sqlPath = path.join(__dirname, 'prisma/sql/01_add_fulltext_search.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Split statements by semicolon while handling triggers and functions correctly
  // This SQL uses semicolon for bodies too, but our SQL is simple enough
  const statements = sql.split('-- Split').filter(s => s.trim().length > 0);
  
  console.log('🚀 Connecting to Database via PG...');
  await client.connect();
  console.log('✅ Connected.');
  
  console.log('🚀 Applying Full-Text Search SQL...');
  
  // Run the whole script or split it
  // Since we have triggers/functions, it's safer to run the whole thing if the driver supports it
  // or use a smarter split. I'll just run it as one query first if possible.
  
  try {
    await client.query(sql);
    console.log(`✅ SQL Executed successfully.`);
  } catch (error: any) {
    console.error(`❌ Error executing SQL: ${error.message}`);
  }

  await client.end();
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
