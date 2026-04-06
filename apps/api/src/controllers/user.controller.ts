import type { Context } from "hono";
import { searchUsers } from "../services/user.service";

export async function searchUsersController(c: Context) {
  try {
    const query = c.req.query("q") || "";
    if (query.length < 2) return c.json([]);

    const users = await searchUsers(query);
    return c.json(users);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connection')) {
      return c.json({ error: "Database unavailable. Please check if PostgreSQL is running." }, 503);
    }
    throw error;
  }
}
