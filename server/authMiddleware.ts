import type { Request, Response, NextFunction } from "express";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";

declare global {
  namespace Express {
    interface Request {
      supabaseUser?: User;
    }
  }
}

/**
 * Validates `Authorization: Bearer <access_token>` via Supabase and attaches the user.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ message: "Invalid or expired session" });
      return;
    }

    req.supabaseUser = user;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
}

function isAdminUser(user: User): boolean {
  const role = user.app_metadata?.role;
  if (role === "admin") {
    return true;
  }
  const emails =
    process.env.ADMIN_EMAILS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  const email = user.email?.toLowerCase();
  if (email && emails.includes(email)) {
    return true;
  }
  return false;
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = req.supabaseUser;
  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (!isAdminUser(user)) {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
}

export function checkCanMutate(user: User | undefined): boolean {
  if (!user) return false;
  return isAdminUser(user);
}
