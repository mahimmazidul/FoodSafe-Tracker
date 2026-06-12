import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('superadmin','manager','engineer')),
  avatar        TEXT NOT NULL DEFAULT '',
  facility_ids  TEXT NOT NULL DEFAULT '[]',
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  last_login    TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS facilities (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  address    TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id                   TEXT PRIMARY KEY,
  facility_id          TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  hazard_type          TEXT NOT NULL CHECK (hazard_type IN ('biological','chemical','physical','allergen')),
  monitoring_frequency TEXT NOT NULL,
  temp_min             REAL NOT NULL,
  temp_max             REAL NOT NULL,
  unit                 TEXT NOT NULL CHECK (unit IN ('F','C')),
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS temperature_logs (
  id                TEXT PRIMARY KEY,
  checkpoint_id     TEXT NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  facility_id       TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  temperature       REAL NOT NULL,
  unit              TEXT NOT NULL CHECK (unit IN ('F','C')),
  is_within_range   INTEGER NOT NULL,
  recorded_by       TEXT NOT NULL,
  recorded_at       TEXT NOT NULL,
  notes             TEXT NOT NULL DEFAULT '',
  corrective_action TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS alerts (
  id                 TEXT PRIMARY KEY,
  facility_id        TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  checkpoint_id      TEXT NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  temperature_log_id TEXT NOT NULL,
  severity           TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  message            TEXT NOT NULL,
  temperature        REAL NOT NULL,
  temp_min           REAL NOT NULL,
  temp_max           REAL NOT NULL,
  created_at         TEXT NOT NULL,
  acknowledged_at    TEXT,
  acknowledged_by    TEXT,
  resolved_at        TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  timestamp   TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  action      TEXT NOT NULL,
  details     TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id   TEXT NOT NULL DEFAULT '',
  ip_address  TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id                    TEXT PRIMARY KEY,
  facility_id           TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  period_start          TEXT NOT NULL,
  period_end            TEXT NOT NULL,
  total_checkpoints     INTEGER NOT NULL,
  compliant_checkpoints INTEGER NOT NULL,
  total_readings        INTEGER NOT NULL,
  violations            INTEGER NOT NULL,
  compliance_score      INTEGER NOT NULL,
  generated_at          TEXT NOT NULL,
  generated_by          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_checkpoint ON temperature_logs(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_logs_facility   ON temperature_logs(facility_id);
CREATE INDEX IF NOT EXISTS idx_logs_recorded   ON temperature_logs(recorded_at);
CREATE INDEX IF NOT EXISTS idx_alerts_facility ON alerts(facility_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status   ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_cp_facility     ON checkpoints(facility_id);
`);

/* ------------------------------------------------------------------ */
/* Row <-> domain mappers                                              */
/* ------------------------------------------------------------------ */

import type {
  Alert,
  AuditEntry,
  Checkpoint,
  ComplianceReport,
  Facility,
  TemperatureLog,
  User,
} from "../types.js";

export function rowToUser(r: any): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    avatar: r.avatar,
    facilityIds: JSON.parse(r.facility_ids),
    createdAt: r.created_at,
    lastLogin: r.last_login,
    isActive: !!r.is_active,
  };
}

export function rowToFacility(r: any): Facility {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    type: r.type,
    createdAt: r.created_at,
  };
}

export function rowToCheckpoint(r: any): Checkpoint {
  return {
    id: r.id,
    facilityId: r.facility_id,
    name: r.name,
    hazardType: r.hazard_type,
    monitoringFrequency: r.monitoring_frequency,
    tempMin: r.temp_min,
    tempMax: r.temp_max,
    unit: r.unit,
    status: r.status,
    createdAt: r.created_at,
  };
}

export function rowToLog(r: any): TemperatureLog {
  return {
    id: r.id,
    checkpointId: r.checkpoint_id,
    facilityId: r.facility_id,
    temperature: r.temperature,
    unit: r.unit,
    isWithinRange: !!r.is_within_range,
    recordedBy: r.recorded_by,
    recordedAt: r.recorded_at,
    notes: r.notes,
    correctiveAction: r.corrective_action,
  };
}

export function rowToAlert(r: any): Alert {
  return {
    id: r.id,
    facilityId: r.facility_id,
    checkpointId: r.checkpoint_id,
    temperatureLogId: r.temperature_log_id,
    severity: r.severity,
    status: r.status,
    message: r.message,
    temperature: r.temperature,
    tempMin: r.temp_min,
    tempMax: r.temp_max,
    createdAt: r.created_at,
    acknowledgedAt: r.acknowledged_at,
    acknowledgedBy: r.acknowledged_by,
    resolvedAt: r.resolved_at,
  };
}

export function rowToAudit(r: any): AuditEntry {
  return {
    id: r.id,
    timestamp: r.timestamp,
    userId: r.user_id,
    user: r.user_name,
    action: r.action,
    details: r.details,
    entityType: r.entity_type,
    entityId: r.entity_id,
    ipAddress: r.ip_address ?? undefined,
  };
}

export function rowToReport(r: any): ComplianceReport {
  return {
    id: r.id,
    facilityId: r.facility_id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    totalCheckpoints: r.total_checkpoints,
    compliantCheckpoints: r.compliant_checkpoints,
    totalReadings: r.total_readings,
    violations: r.violations,
    complianceScore: r.compliance_score,
    generatedAt: r.generated_at,
    generatedBy: r.generated_by,
  };
}
