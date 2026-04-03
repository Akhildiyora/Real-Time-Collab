import bcrypt from "bcrypt";
import { prisma } from "../../../../packages/db/src/index";
export async function createUser(email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return prisma.user.create({
        data: { email, password: hashedPassword },
    });
}
export function getUserByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
}
export async function verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}
