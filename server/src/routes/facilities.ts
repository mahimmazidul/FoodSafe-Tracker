import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db, rowToFacility } from "../lib/db.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const facilitiesRouter = Router();
facilitiesRouter.use(requireAuth);

const facilitySchema = z.object({
  name: z.string().min(1),
  address: z.string().default(""),
  type: z.string().default(""),
});

facilitiesRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM facilities ORDER BY created_at").all();
  res.json(rows.map(rowToFacility));
});

facilitiesRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM facilities WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Facility not found" });
  res.json(rowToFacility(row));
});

facilitiesRouter.post(
  "/",
  requirePermission("create_facilities"),
  validateBody(facilitySchema),
  (req, res) => {
    const data = req.body as z.infer<typeof facilitySchema>;
    const id = uuid();
    const createdAt = new Date().toISOString();

    db.prepare(
      "INSERT INTO facilities (id, name, address, type, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, data.name, data.address, data.type, createdAt);

    recordAudit({
      action: "facility_created",
      details: `Created facility "${data.name}"`,
      entityType: "facility",
      entityId: id,
      user: req.user,
      ipAddress: req.ip,
    });

    res.status(201).json({ id, ...data, createdAt });
  }
);

facilitiesRouter.patch(
  "/:id",
  requirePermission("edit_facilities"),
  validateBody(facilitySchema.partial()),
  (req, res) => {
    const data = req.body as Partial<z.infer<typeof facilitySchema>>;
    const row = db.prepare("SELECT * FROM facilities WHERE id = ?").get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: "Facility not found" });

    db.prepare("UPDATE facilities SET name = ?, address = ?, type = ? WHERE id = ?").run(
      data.name ?? row.name,
      data.address ?? row.address,
      data.type ?? row.type,
      req.params.id
    );

    recordAudit({
      action: "facility_updated",
      details: `Updated facility "${data.name ?? row.name}"`,
      entityType: "facility",
      entityId: req.params.id,
      user: req.user,
      ipAddress: req.ip,
    });

    const updated = db.prepare("SELECT * FROM facilities WHERE id = ?").get(req.params.id);
    res.json(rowToFacility(updated));
  }
);

facilitiesRouter.delete("/:id", requirePermission("edit_facilities"), (req, res) => {
  const row = db.prepare("SELECT * FROM facilities WHERE id = ?").get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "Facility not found" });

  db.prepare("DELETE FROM facilities WHERE id = ?").run(req.params.id);

  recordAudit({
    action: "facility_updated",
    details: `Deleted facility "${row.name}"`,
    entityType: "facility",
    entityId: req.params.id,
    user: req.user,
    ipAddress: req.ip,
  });

  res.json({ success: true });
});
