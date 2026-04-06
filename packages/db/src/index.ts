import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;
import { PrismaClient } from "../generated/prisma";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// Optional: Connection probe in development
if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
  pool
    .connect()
    .then((client) => {
      console.log("🐘 Database connected successfully on port 5432");
      client.release();
    })
    .catch((err) => {
      console.error("❌ Database connection failed. Is PostgreSQL running?");
      console.error(`   Error: ${err.message}`);
    });
}

export type { PrismaClient } from "../generated/prisma";
