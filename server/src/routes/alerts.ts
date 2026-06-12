import { Router } from "express";
import { db, rowToAlert } from "../lib/db.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

alertsRouter.get("/", (req, res) => {
  const { facilityId, status, severity } = req.query;

  const where: string[] = [];
  const params: any[] = [];
  if (facilityId) {
    where.push("facility_id = ?");
    params.push(facilityId);
  }
  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  if (severity) {
    where.push("severity = ?");
    params.push(severity);
  }

  const sql = `SELECT * FROM alerts
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY created_at DESC`;

  res.json(db.prepare(sql).all(...params).map(rowToAlert));
});

alertsRouter.post("/:id/acknowledge", requirePermission("acknowledge_alerts"), (req, res) => {
  const row = db.prepare("SELECT * FROM alerts WHERE id = ?").get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "Alert not found" });
  if (row.status !== "open") {
    return res.status(409).json({ error: `Alert is already ${row.status}` });
  }

  db.prepare(
    "UPDATE alerts SET status = 'acknowledged', acknowledged_at = ?, acknowledged_by = ? WHERE id = ?"
  ).run(new Date().toISOString(), req.user!.name, req.params.id);

  recordAudit({
    action: "alert_acknowledged",
    details: `Alert ${String(req.params.id).slice(0, 8)} marked as acknowledged`,
    entityType: "alert",
    entityId: req.params.id,
    user: req.user,
    ipAddress: req.ip,
  });

  res.json(rowToAlert(db.prepare("SELECT * FROM alerts WHERE id = ?").get(req.params.id)));
});

alertsRouter.post("/:id/resolve", requirePermission("resolve_alerts"), (req, res) => {
  const row = db.prepare("SELECT * FROM alerts WHERE id = ?").get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "Alert not found" });
  if (row.status === "resolved") {
    return res.status(409).json({ error: "Alert is already resolved" });
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE alerts SET status = 'resolved', resolved_at = ?,
       acknowledged_at = COALESCE(acknowledged_at, ?),
       acknowledged_by = COALESCE(acknowledged_by, ?)
     WHERE id = ?`
  ).run(now, now, req.user!.name, req.params.id);

  recordAudit({
    action: "alert_resolved",
    details: `Alert ${String(req.params.id).slice(0, 8)} marked as resolved`,
    entityType: "alert",
    entityId: req.params.id,
    user: req.user,
    ipAddress: req.ip,
  });

  res.json(rowToAlert(db.prepare("SELECT * FROM alerts WHERE id = ?").get(req.params.id)));
});
