import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../lib/config.js";
import { db, rowToUser } from "../lib/db.js";
import { ROLE_PERMISSIONS, type User } from "../types.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface TokenPayload {
  sub: string;
  role: string;
}

export function signToken(user: User): string {
  return jwt.sign(
    { sub: user.id, role: user.role } satisfies TokenPayload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as TokenPayload;
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub);
    if (!row) return res.status(401).json({ error: "User no longer exists" });

    const user = rowToUser(row);
    if (!user.isActive) return res.status(403).json({ error: "Account is inactive" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Require a specific permission (see ROLE_PERMISSIONS, mirrors frontend). */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthenticated" });
    if (!ROLE_PERMISSIONS[user.role]?.includes(permission)) {
      return res.status(403).json({ error: `Missing permission: ${permission}` });
    }
    next();
  };
}
