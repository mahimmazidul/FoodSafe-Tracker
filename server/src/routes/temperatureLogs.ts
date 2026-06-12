import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db, rowToAlert, rowToCheckpoint, rowToLog } from "../lib/db.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import type { Alert, Severity } from "../types.js";

export const temperatureLogsRouter = Router();
temperatureLogsRouter.use(requireAuth);

const logSchema = z.object({
  checkpointId: z.string().min(1),
  temperature: z.number(),
  unit: z.enum(["F", "C"]).optional(),
  notes: z.string().default(""),
  correctiveAction: z.string().default(""),
  recordedAt: z.string().datetime().optional(),
});

temperatureLogsRouter.get("/", (req, res) => {
  const { facilityId, checkpointId, from, to, limit } = req.query;

  const where: string[] = [];
  const params: any[] = [];
  if (facilityId) {
    where.push("facility_id = ?");
    params.push(facilityId);
  }
  if (checkpointId) {
    where.push("checkpoint_id = ?");
    params.push(checkpointId);
  }
  if (from) {
    where.push("recorded_at >= ?");
    params.push(from);
  }
  if (to) {
    where.push("recorded_at <= ?");
    params.push(to);
  }

  const sql = `SELECT * FROM temperature_logs
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY recorded_at DESC
    LIMIT ?`;
  params.push(Math.min(Number(limit) || 500, 5000));

  res.json(db.prepare(sql).all(...params).map(rowToLog));
});

/**
 * POST /api/temperature-logs
 * Logs a reading; the server determines compliance and automatically
 * creates an alert when the reading is out of range (same severity
 * thresholds as the frontend: dev > 15 critical, > 8 high, > 4 medium, else low).
 */
temperatureLogsRouter.post(
  "/",
  requirePermission("log_temperature"),
  validateBody(logSchema),
  (req, res) => {
    const data = req.body as z.infer<typeof logSchema>;
    const user = req.user!;

    const cpRow = db.prepare("SELECT * FROM checkpoints WHERE id = ?").get(data.checkpointId) as any;
    if (!cpRow) return res.status(400).json({ error: "Checkpoint does not exist" });
    const cp = rowToCheckpoint(cpRow);

    const unit = data.unit ?? cp.unit;
    const isWithinRange = data.temperature >= cp.tempMin && data.temperature <= cp.tempMax;

    const id = uuid();
    const recordedAt = data.recordedAt ?? new Date().toISOString();

    db.prepare(
      `INSERT INTO temperature_logs (id, checkpoint_id, facility_id, temperature, unit, is_within_range, recorded_by, recorded_at, notes, corrective_action)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      cp.id,
      cp.facilityId,
      data.temperature,
      unit,
      isWithinRange ? 1 : 0,
      user.name,
      recordedAt,
      data.notes,
      data.correctiveAction
    );

    recordAudit({
      action: "temperature_logged",
      details: `${data.temperature}°${unit} at ${cp.name}`,
      entityType: "temperature_log",
      entityId: id,
      user,
      ipAddress: req.ip,
    });

    let alert: Alert | null = null;
    if (!isWithinRange) {
      const dev =
        data.temperature < cp.tempMin
          ? cp.tempMin - data.temperature
          : data.temperature - cp.tempMax;
      const severity: Severity =
        dev > 15 ? "critical" : dev > 8 ? "high" : dev > 4 ? "medium" : "low";

      const alertId = uuid();
      const message = `${cp.name}: ${data.temperature}°${unit} outside range ${cp.tempMin}–${cp.tempMax}°${cp.unit}`;

      db.prepare(
        `INSERT INTO alerts (id, facility_id, checkpoint_id, temperature_log_id, severity, status, message, temperature, temp_min, temp_max, created_at)
         VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)`
      ).run(
        alertId,
        cp.facilityId,
        cp.id,
        id,
        severity,
        message,
        data.temperature,
        cp.tempMin,
        cp.tempMax,
        new Date().toISOString()
      );

      recordAudit({
        action: "alert_created",
        details: message,
        entityType: "alert",
        entityId: alertId,
        user,
        ipAddress: req.ip,
      });

      alert = rowToAlert(db.prepare("SELECT * FROM alerts WHERE id = ?").get(alertId));
    }

    const log = rowToLog(db.prepare("SELECT * FROM temperature_logs WHERE id = ?").get(id));
    res.status(201).json({ log, alert });
  }
);

const correctiveSchema = z.object({ correctiveAction: z.string().min(1) });

temperatureLogsRouter.patch(
  "/:id/corrective-action",
  requirePermission("log_temperature"),
  validateBody(correctiveSchema),
  (req, res) => {
    const row = db.prepare("SELECT * FROM temperature_logs WHERE id = ?").get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: "Temperature log not found" });

    db.prepare("UPDATE temperature_logs SET corrective_action = ? WHERE id = ?").run(
      req.body.correctiveAction,
      req.params.id
    );

    recordAudit({
      action: "corrective_action_added",
      details: `Corrective action added to log ${String(req.params.id).slice(0, 8)}`,
      entityType: "temperature_log",
      entityId: req.params.id,
      user: req.user,
      ipAddress: req.ip,
    });

    const updated = db.prepare("SELECT * FROM temperature_logs WHERE id = ?").get(req.params.id);
    res.json(rowToLog(updated));
  }
);
