import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, rowToUser } from "../lib/db.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", validateBody(loginSchema), (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (!row || !row.is_active) {
    return res.status(401).json({ error: "User not found or inactive" });
  }
  if (!bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "Invalid password" });
  }

  const lastLogin = new Date().toISOString();
  db.prepare("UPDATE users SET last_login = ? WHERE id = ?").run(lastLogin, row.id);

  const user = rowToUser({ ...row, last_login: lastLogin });
  recordAudit({
    action: "user_login",
    details: `User ${user.name} logged in`,
    entityType: "user",
    entityId: user.id,
    user,
    ipAddress: req.ip,
  });

  res.json({ token: signToken(user), user });
});

authRouter.post("/logout", requireAuth, (req, res) => {
  const user = req.user!;
  recordAudit({
    action: "user_logout",
    details: `User ${user.name} logged out`,
    entityType: "user",
    entityId: user.id,
    user,
    ipAddress: req.ip,
  });
  res.json({ success: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});
