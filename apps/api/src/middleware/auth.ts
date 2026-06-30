import type { Request, Response, NextFunction } from "express";
import { prisma } from "@outpitch/db";
import { AppError } from "./error.js";

export interface AuthUser {
  clerkId: string;
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const clerkId = req.headers["x-clerk-user-id"] as string | undefined;
  if (!clerkId) {
    throw new AppError(401, "Unauthorized", "AUTH_REQUIRED");
  }

  let user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId },
    });
  }

  req.auth = { clerkId, userId: user.id };
  next();
}

export async function getOrCreateUser(clerkId: string, data?: { email?: string; name?: string }) {
  return prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, ...data },
    update: data ?? {},
  });
}
