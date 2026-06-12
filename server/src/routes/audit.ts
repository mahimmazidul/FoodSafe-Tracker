import { Router } from "express";
import { db, rowToAudit } from "../lib/db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const auditRouter = Router();
auditRouter.use(requireAuth, requirePermission("view_audit"));

auditRouter.get("/", (req, res) => {
  const { userId, action, entityType, from, to, limit } = req.query;

  const where: string[] = [];
  const params: any[] = [];
  if (userId) {
    where.push("user_id = ?");
    params.push(userId);
  }
  if (action) {
    where.push("action = ?");
    params.push(action);
  }
  if (entityType) {
    where.push("entity_type = ?");
    params.push(entityType);
  }
  if (from) {
    where.push("timestamp >= ?");
    params.push(from);
  }
  if (to) {
    where.push("timestamp <= ?");
    params.push(to);
  }

  const sql = `SELECT * FROM audit_log
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY timestamp DESC
    LIMIT ?`;
  params.push(Math.min(Number(limit) || 500, 5000));

  res.json(db.prepare(sql).all(...params).map(rowToAudit));
});
