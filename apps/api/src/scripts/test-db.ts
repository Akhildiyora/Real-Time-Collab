import "dotenv/config";
import { prisma } from "@repo/db";

async function testConnection() {
  console.log("🔍 Testing database connection...");
  try {
    const userCount = await prisma.user.count();
    const docCount = await prisma.document.count();
    console.log(`✅ Success! Connection established.`);
    console.log(`📊 Current user count: ${userCount}`);
    console.log(`📊 Current document count: ${docCount}`);
  } catch (error: any) {
    console.error("❌ Connection failed!");
    console.error(`📝 Error type: ${error.constructor.name}`);
    console.error(`💬 Message: ${error.message}`);
    
    if (error.message.includes("ECONNREFUSED")) {
      console.log("\n💡 Recommendation: PostgreSQL is refusing the connection.");
      console.log("   Please check if the PostgreSQL service is running on Port 5432.");
    }
  } finally {
    process.exit();
  }
}

testConnection();
