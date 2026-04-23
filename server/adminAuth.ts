import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "";

if (!ADMIN_EMAIL || !ADMIN_SECRET_KEY) {
  throw new Error("Missing ADMIN_EMAIL or ADMIN_SECRET_KEY");
}

const adminSessions = new Set<string>();

export function generateAdminToken(): string {
  const token = crypto.randomUUID();
  adminSessions.add(token);
  return token;
}

export function invalidateAdminToken(token: string) {
  adminSessions.delete(token);
}

export function isValidAdminToken(token: string): boolean {
  return adminSessions.has(token);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !isValidAdminToken(token)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export { ADMIN_EMAIL, ADMIN_SECRET_KEY };
