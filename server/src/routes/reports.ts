import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db, rowToLog, rowToReport } from "../lib/db.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import type { Checkpoint, ComplianceReport } from "../types.js";
import { rowToCheckpoint } from "../lib/db.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.get("/", requirePermission("view_reports"), (req, res) => {
  const { facilityId } = req.query;
  const rows = facilityId
    ? db.prepare("SELECT * FROM reports WHERE facility_id = ? ORDER BY generated_at DESC").all(facilityId)
    : db.prepare("SELECT * FROM reports ORDER BY generated_at DESC").all();
  res.json(rows.map(rowToReport));
});

const generateSchema = z.object({
  facilityId: z.string().min(1),
  periodDays: z.number().int().min(1).max(365).default(30),
});

/**
 * POST /api/reports/generate
 * Computes a compliance report for the trailing period (default 30 days),
 * using the same scoring logic as the frontend:
 *  - checkpoint compliant if violation rate < 10%
 *  - score = % of in-range readings (100 if no readings)
 */
reportsRouter.post(
  "/generate",
  requirePermission("generate_reports"),
  validateBody(generateSchema),
  (req, res) => {
    const { facilityId, periodDays } = req.body as z.infer<typeof generateSchema>;

    const facility = db.prepare("SELECT 1 FROM facilities WHERE id = ?").get(facilityId);
    if (!facility) return res.status(400).json({ error: "Facility does not exist" });

    const periodStart = new Date(Date.now() - periodDays * 86400000).toISOString();
    const periodEnd = new Date().toISOString();

    const logs = db
      .prepare("SELECT * FROM temperature_logs WHERE facility_id = ? AND recorded_at >= ?")
      .all(facilityId, periodStart)
      .map(rowToLog);
    const checkpoints: Checkpoint[] = db
      .prepare("SELECT * FROM checkpoints WHERE facility_id = ?")
      .all(facilityId)
      .map(rowToCheckpoint);

    const violations = logs.filter((l) => !l.isWithinRange).length;
    const compliant = checkpoints.filter((cp) => {
      const cpLogs = logs.filter((l) => l.checkpointId === cp.id);
      const cpViolations = cpLogs.filter((l) => !l.isWithinRange).length;
      return cpViolations / Math.max(cpLogs.length, 1) < 0.1;
    }).length;
    const score =
      logs.length > 0 ? Math.round(((logs.length - violations) / logs.length) * 100) : 100;

    const report: ComplianceReport = {
      id: uuid(),
      facilityId,
      periodStart,
      periodEnd,
      totalCheckpoints: checkpoints.length,
      compliantCheckpoints: compliant,
      totalReadings: logs.length,
      violations,
      complianceScore: score,
      generatedAt: periodEnd,
      generatedBy: req.user!.name,
    };

    db.prepare(
      `INSERT INTO reports (id, facility_id, period_start, period_end, total_checkpoints, compliant_checkpoints, total_readings, violations, compliance_score, generated_at, generated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      report.id,
      report.facilityId,
      report.periodStart,
      report.periodEnd,
      report.totalCheckpoints,
      report.compliantCheckpoints,
      report.totalReadings,
      report.violations,
      report.complianceScore,
      report.generatedAt,
      report.generatedBy
    );

    recordAudit({
      action: "report_generated",
      details: `Compliance report for facility ${facilityId.slice(0, 8)}`,
      entityType: "report",
      entityId: report.id,
      user: req.user,
      ipAddress: req.ip,
    });

    res.status(201).json(report);
  }
);

/** Export a report's underlying readings as CSV. */
reportsRouter.get("/:id/csv", requirePermission("view_reports"), (req, res) => {
  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "Report not found" });
  const report = rowToReport(row);

  const logs = db
    .prepare(
      "SELECT * FROM temperature_logs WHERE facility_id = ? AND recorded_at >= ? AND recorded_at <= ? ORDER BY recorded_at"
    )
    .all(report.facilityId, report.periodStart, report.periodEnd)
    .map(rowToLog);

  const cpNames = new Map<string, string>(
    (db.prepare("SELECT id, name FROM checkpoints").all() as any[]).map((c) => [c.id, c.name])
  );

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "Recorded At",
    "Checkpoint",
    "Temperature",
    "Unit",
    "Within Range",
    "Recorded By",
    "Notes",
    "Corrective Action",
  ].join(",");
  const lines = logs.map((l) =>
    [
      l.recordedAt,
      cpNames.get(l.checkpointId) ?? l.checkpointId,
      l.temperature,
      l.unit,
      l.isWithinRange ? "Yes" : "No",
      l.recordedBy,
      l.notes,
      l.correctiveAction,
    ]
      .map(esc)
      .join(",")
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="compliance-report-${report.id.slice(0, 8)}.csv"`
  );
  res.send([header, ...lines].join("\n"));
});
