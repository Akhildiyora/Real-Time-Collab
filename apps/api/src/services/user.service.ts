import bcrypt from "bcrypt";
import { prisma } from "@repo/db";

export async function createUser(email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { email, password: hashedPassword },
  });
}

export function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export async function searchUsers(query: string) {
  return prisma.user.findMany({
    where: {
      email: { contains: query, mode: "insensitive" },
    },
    select: { id: true, email: true },
    take: 10,
  });
}
