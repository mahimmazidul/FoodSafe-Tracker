import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

/** Dashboard summary: counts and compliance for the trailing 24h / 7d. */
analyticsRouter.get("/summary", (req, res) => {
  const { facilityId } = req.query;
  const facilityFilter = facilityId ? "AND facility_id = ?" : "";
  const params = facilityId ? [facilityId] : [];

  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const readings24h = db
    .prepare(`SELECT COUNT(*) AS n FROM temperature_logs WHERE recorded_at >= ? ${facilityFilter}`)
    .get(dayAgo, ...params) as any;
  const violations24h = db
    .prepare(
      `SELECT COUNT(*) AS n FROM temperature_logs WHERE recorded_at >= ? AND is_within_range = 0 ${facilityFilter}`
    )
    .get(dayAgo, ...params) as any;
  const readings7d = db
    .prepare(`SELECT COUNT(*) AS n FROM temperature_logs WHERE recorded_at >= ? ${facilityFilter}`)
    .get(weekAgo, ...params) as any;
  const violations7d = db
    .prepare(
      `SELECT COUNT(*) AS n FROM temperature_logs WHERE recorded_at >= ? AND is_within_range = 0 ${facilityFilter}`
    )
    .get(weekAgo, ...params) as any;
  const openAlerts = db
    .prepare(`SELECT COUNT(*) AS n FROM alerts WHERE status = 'open' ${facilityFilter}`)
    .get(...params) as any;
  const activeCheckpoints = db
    .prepare(`SELECT COUNT(*) AS n FROM checkpoints WHERE status = 'active' ${facilityFilter}`)
    .get(...params) as any;

  const score = (total: number, bad: number) =>
    total > 0 ? Math.round(((total - bad) / total) * 100) : 100;

  res.json({
    readings24h: readings24h.n,
    violations24h: violations24h.n,
    complianceScore24h: score(readings24h.n, violations24h.n),
    readings7d: readings7d.n,
    violations7d: violations7d.n,
    complianceScore7d: score(readings7d.n, violations7d.n),
    openAlerts: openAlerts.n,
    activeCheckpoints: activeCheckpoints.n,
  });
});

/** Daily reading/violation counts for trend charts. ?days=30 */
analyticsRouter.get("/trends", requirePermission("view_analytics"), (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 365);
  const { facilityId } = req.query;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const facilityFilter = facilityId ? "AND facility_id = ?" : "";
  const params: any[] = facilityId ? [since, facilityId] : [since];

  const rows = db
    .prepare(
      `SELECT substr(recorded_at, 1, 10) AS day,
              COUNT(*) AS readings,
              SUM(CASE WHEN is_within_range = 0 THEN 1 ELSE 0 END) AS violations,
              ROUND(AVG(temperature), 1) AS avgTemperature
       FROM temperature_logs
       WHERE recorded_at >= ? ${facilityFilter}
       GROUP BY day
       ORDER BY day`
    )
    .all(...params);

  res.json(rows);
});

/** Per-checkpoint violation stats. */
analyticsRouter.get("/checkpoints", requirePermission("view_analytics"), (req, res) => {
  const { facilityId } = req.query;
  const facilityFilter = facilityId ? "WHERE c.facility_id = ?" : "";
  const params = facilityId ? [facilityId] : [];

  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.facility_id AS facilityId,
              COUNT(t.id) AS readings,
              SUM(CASE WHEN t.is_within_range = 0 THEN 1 ELSE 0 END) AS violations
       FROM checkpoints c
       LEFT JOIN temperature_logs t ON t.checkpoint_id = c.id
       ${facilityFilter}
       GROUP BY c.id
       ORDER BY violations DESC`
    )
    .all(...params);

  res.json(rows);
});
