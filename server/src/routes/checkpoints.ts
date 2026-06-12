import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db, rowToCheckpoint } from "../lib/db.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const checkpointsRouter = Router();
checkpointsRouter.use(requireAuth);

const checkpointSchema = z
  .object({
    facilityId: z.string().min(1),
    name: z.string().min(1),
    hazardType: z.enum(["biological", "chemical", "physical", "allergen"]),
    monitoringFrequency: z.enum([
      "hourly",
      "every-2-hours",
      "every-4-hours",
      "daily",
      "weekly",
    ]),
    tempMin: z.number(),
    tempMax: z.number(),
    unit: z.enum(["F", "C"]),
    status: z.enum(["active", "inactive"]).default("active"),
  })
  .refine((d) => d.tempMin < d.tempMax, {
    message: "tempMin must be less than tempMax",
    path: ["tempMin"],
  });

checkpointsRouter.get("/", (req, res) => {
  const { facilityId } = req.query;
  const rows = facilityId
    ? db.prepare("SELECT * FROM checkpoints WHERE facility_id = ? ORDER BY created_at").all(facilityId)
    : db.prepare("SELECT * FROM checkpoints ORDER BY created_at").all();
  res.json(rows.map(rowToCheckpoint));
});

checkpointsRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM checkpoints WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Checkpoint not found" });
  res.json(rowToCheckpoint(row));
});

checkpointsRouter.post(
  "/",
  requirePermission("create_checkpoints"),
  validateBody(checkpointSchema),
  (req, res) => {
    const data = req.body as z.infer<typeof checkpointSchema>;

    const facility = db.prepare("SELECT 1 FROM facilities WHERE id = ?").get(data.facilityId);
    if (!facility) return res.status(400).json({ error: "Facility does not exist" });

    const id = uuid();
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO checkpoints (id, facility_id, name, hazard_type, monitoring_frequency, temp_min, temp_max, unit, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.facilityId,
      data.name,
      data.hazardType,
      data.monitoringFrequency,
      data.tempMin,
      data.tempMax,
      data.unit,
      data.status,
      createdAt
    );

    recordAudit({
      action: "checkpoint_created",
      details: `Created checkpoint "${data.name}"`,
      entityType: "checkpoint",
      entityId: id,
      user: req.user,
      ipAddress: req.ip,
    });

    res.status(201).json({ id, ...data, createdAt });
  }
);

checkpointsRouter.patch(
  "/:id",
  requirePermission("edit_checkpoints"),
  validateBody(checkpointSchema.innerType().partial()),
  (req, res) => {
    const data = req.body as Record<string, any>;
    const row = db.prepare("SELECT * FROM checkpoints WHERE id = ?").get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: "Checkpoint not found" });

    const tempMin = data.tempMin ?? row.temp_min;
    const tempMax = data.tempMax ?? row.temp_max;
    if (tempMin >= tempMax) {
      return res.status(400).json({ error: "tempMin must be less than tempMax" });
    }

    db.prepare(
      `UPDATE checkpoints SET
         facility_id = ?, name = ?, hazard_type = ?, monitoring_frequency = ?,
         temp_min = ?, temp_max = ?, unit = ?, status = ?
       WHERE id = ?`
    ).run(
      data.facilityId ?? row.facility_id,
      data.name ?? row.name,
      data.hazardType ?? row.hazard_type,
      data.monitoringFrequency ?? row.monitoring_frequency,
      tempMin,
      tempMax,
      data.unit ?? row.unit,
      data.status ?? row.status,
      req.params.id
    );

    recordAudit({
      action: "checkpoint_modified",
      details: `Modified checkpoint "${data.name ?? row.name}"`,
      entityType: "checkpoint",
      entityId: req.params.id,
      user: req.user,
      ipAddress: req.ip,
    });

    const updated = db.prepare("SELECT * FROM checkpoints WHERE id = ?").get(req.params.id);
    res.json(rowToCheckpoint(updated));
  }
);

checkpointsRouter.delete("/:id", requirePermission("edit_checkpoints"), (req, res) => {
  const row = db.prepare("SELECT * FROM checkpoints WHERE id = ?").get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "Checkpoint not found" });

  db.prepare("DELETE FROM checkpoints WHERE id = ?").run(req.params.id);

  recordAudit({
    action: "checkpoint_modified",
    details: `Deleted checkpoint "${row.name}"`,
    entityType: "checkpoint",
    entityId: req.params.id,
    user: req.user,
    ipAddress: req.ip,
  });

  res.json({ success: true });
});
