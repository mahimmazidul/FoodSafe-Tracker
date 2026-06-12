import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db, rowToUser } from "../lib/db.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

const userBase = {
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["superadmin", "manager", "engineer"]),
  avatar: z.string().default(""),
  facilityIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
};

const createUserSchema = z.object({
  ...userBase,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const updateUserSchema = z
  .object({ ...userBase, password: z.string().min(6) })
  .partial();

usersRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at").all();
  res.json(rows.map(rowToUser));
});

usersRouter.post(
  "/",
  requirePermission("manage_users"),
  validateBody(createUserSchema),
  (req, res) => {
    const data = req.body as z.infer<typeof createUserSchema>;

    const exists = db.prepare("SELECT 1 FROM users WHERE email = ?").get(data.email);
    if (exists) return res.status(409).json({ error: "Email already in use" });

    const id = uuid();
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, email, name, role, avatar, facility_ids, password_hash, created_at, last_login, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`
    ).run(
      id,
      data.email,
      data.name,
      data.role,
      data.avatar ||
        data.name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      JSON.stringify(data.facilityIds),
      bcrypt.hashSync(data.password, 10),
      createdAt,
      data.isActive ? 1 : 0
    );

    recordAudit({
      action: "user_created",
      details: `Created user ${data.name} (${data.role})`,
      entityType: "user",
      entityId: id,
      user: req.user,
      ipAddress: req.ip,
    });

    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    res.status(201).json(rowToUser(row));
  }
);

usersRouter.patch(
  "/:id",
  requirePermission("manage_users"),
  validateBody(updateUserSchema),
  (req, res) => {
    const data = req.body as z.infer<typeof updateUserSchema>;
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: "User not found" });

    if (data.email && data.email !== row.email) {
      const exists = db.prepare("SELECT 1 FROM users WHERE email = ?").get(data.email);
      if (exists) return res.status(409).json({ error: "Email already in use" });
    }

    db.prepare(
      `UPDATE users SET
         email = ?, name = ?, role = ?, avatar = ?, facility_ids = ?, is_active = ?,
         password_hash = ?
       WHERE id = ?`
    ).run(
      data.email ?? row.email,
      data.name ?? row.name,
      data.role ?? row.role,
      data.avatar ?? row.avatar,
      data.facilityIds ? JSON.stringify(data.facilityIds) : row.facility_ids,
      (data.isActive ?? !!row.is_active) ? 1 : 0,
      data.password ? bcrypt.hashSync(data.password, 10) : row.password_hash,
      req.params.id
    );

    recordAudit({
      action: "user_updated",
      details: `Updated user ${data.name ?? row.name}`,
      entityType: "user",
      entityId: req.params.id,
      user: req.user,
      ipAddress: req.ip,
    });

    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    res.json(rowToUser(updated));
  }
);

usersRouter.delete("/:id", requirePermission("manage_users"), (req, res) => {
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "User not found" });

  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);

  recordAudit({
    action: "user_deleted",
    details: `Deleted user ${row.name}`,
    entityType: "user",
    entityId: req.params.id,
    user: req.user,
    ipAddress: req.ip,
  });

  res.json({ success: true });
});
