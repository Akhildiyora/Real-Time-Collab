import { Hono } from "hono";
import { authMiddleware } from "../middlewares/auth.middleware";
import { searchUsersController } from "../controllers/user.controller";

export const userRoutes = new Hono();

userRoutes.use("*", authMiddleware);
userRoutes.get("/search", searchUsersController);
