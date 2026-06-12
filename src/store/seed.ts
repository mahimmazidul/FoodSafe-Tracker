import { v4 as uuid } from "uuid";
import type {
  Facility,
  Checkpoint,
  TemperatureLog,
  Alert,
  AuditEntry,
  ComplianceReport,
  User,
  AuditAction,
} from "./types";

const now = new Date();
const h = (hours: number) => new Date(now.getTime() - hours * 3600000).toISOString();
const d = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

const adminId = uuid();
const managerId = uuid();
const engineerId = uuid();

const fac1 = uuid();
const fac2 = uuid();
const fac3 = uuid();

const cp1 = uuid();
const cp2 = uuid();
const cp3 = uuid();
const cp4 = uuid();
const cp5 = uuid();
const cp6 = uuid();
const cp7 = uuid();
const cp8 = uuid();

export const seedUsers: User[] = [
  {
    id: adminId,
    email: "admin@foodsafe.io",
    name: "Alex Johnson",
    role: "superadmin",
    avatar: "AJ",
    facilityIds: [fac1, fac2, fac3],
    createdAt: d(180),
    lastLogin: h(2),
    isActive: true,
  },
  {
    id: managerId,
    email: "manager@foodsafe.io",
    name: "Sarah Chen",
    role: "manager",
    avatar: "SC",
    facilityIds: [fac1, fac2],
    createdAt: d(90),
    lastLogin: h(5),
    isActive: true,
  },
  {
    id: engineerId,
    email: "engineer@foodsafe.io",
    name: "Mike Torres",
    role: "engineer",
    avatar: "MT",
    facilityIds: [fac1],
    createdAt: d(30),
    lastLogin: h(1),
    isActive: true,
  },
];

export const seedPasswords: Record<string, string> = {
  "admin@foodsafe.io": "admin123",
  "manager@foodsafe.io": "manager123",
  "engineer@foodsafe.io": "engineer123",
};

export const seedFacilities: Facility[] = [
  { id: fac1, name: "Downtown Kitchen", address: "123 Main St, Portland, OR 97201", type: "Restaurant", createdAt: d(90) },
  { id: fac2, name: "Harbor Fresh Market", address: "456 Dock Ave, Portland, OR 97209", type: "Market", createdAt: d(60) },
  { id: fac3, name: "Sunrise Bakery", address: "789 Oak Ln, Portland, OR 97214", type: "Bakery", createdAt: d(30) },
];

export const seedCheckpoints: Checkpoint[] = [
  { id: cp1, facilityId: fac1, name: "Walk-in Cooler A", hazardType: "biological", monitoringFrequency: "every-2-hours", tempMin: 33, tempMax: 40, unit: "F", status: "active", createdAt: d(89) },
  { id: cp2, facilityId: fac1, name: "Prep Station 1", hazardType: "biological", monitoringFrequency: "hourly", tempMin: 33, tempMax: 41, unit: "F", status: "active", createdAt: d(89) },
  { id: cp3, facilityId: fac1, name: "Freezer Unit B", hazardType: "biological", monitoringFrequency: "every-4-hours", tempMin: -10, tempMax: 0, unit: "F", status: "active", createdAt: d(88) },
  { id: cp4, facilityId: fac2, name: "Seafood Display", hazardType: "biological", monitoringFrequency: "hourly", tempMin: 30, tempMax: 38, unit: "F", status: "active", createdAt: d(59) },
  { id: cp5, facilityId: fac2, name: "Produce Cooler", hazardType: "chemical", monitoringFrequency: "every-2-hours", tempMin: 34, tempMax: 42, unit: "F", status: "active", createdAt: d(59) },
  { id: cp6, facilityId: fac2, name: "Dry Storage", hazardType: "physical", monitoringFrequency: "daily", tempMin: 50, tempMax: 70, unit: "F", status: "active", createdAt: d(58) },
  { id: cp7, facilityId: fac3, name: "Proofing Cabinet", hazardType: "biological", monitoringFrequency: "every-2-hours", tempMin: 75, tempMax: 85, unit: "F", status: "active", createdAt: d(29) },
  { id: cp8, facilityId: fac3, name: "Ingredient Cooler", hazardType: "allergen", monitoringFrequency: "every-4-hours", tempMin: 33, tempMax: 40, unit: "F", status: "inactive", createdAt: d(29) },
];

function genLogs(): TemperatureLog[] {
  const logs: TemperatureLog[] = [];
  const staff = ["John Smith", "Maria Garcia", "Alex Chen", "Sarah Johnson", "Mike Torres"];

  const cpMap: Record<string, Checkpoint> = {};
  seedCheckpoints.forEach((c) => (cpMap[c.id] = c));

  for (let day = 0; day < 30; day++) {
    seedCheckpoints.filter((c) => c.status === "active").forEach((cp) => {
      const readingsPerDay = cp.monitoringFrequency === "hourly" ? 8 : cp.monitoringFrequency === "every-2-hours" ? 4 : cp.monitoringFrequency === "every-4-hours" ? 3 : 1;
      for (let r = 0; r < readingsPerDay; r++) {
        const hourOffset = day * 24 + r * (24 / readingsPerDay) + Math.random() * 2;
        const isViolation = Math.random() < 0.08;
        const midpoint = (cp.tempMin + cp.tempMax) / 2;
        const range = cp.tempMax - cp.tempMin;
        let temp: number;
        if (isViolation) {
          temp = Math.random() < 0.5 ? cp.tempMin - (Math.random() * 8 + 2) : cp.tempMax + (Math.random() * 8 + 2);
        } else {
          temp = midpoint + (Math.random() - 0.5) * range * 0.8;
        }
        temp = Math.round(temp * 10) / 10;
        const withinRange = temp >= cp.tempMin && temp <= cp.tempMax;
        logs.push({
          id: uuid(),
          checkpointId: cp.id,
          facilityId: cp.facilityId,
          temperature: temp,
          unit: cp.unit,
          isWithinRange: withinRange,
          recordedBy: staff[Math.floor(Math.random() * staff.length)],
          recordedAt: h(hourOffset),
          notes: isViolation ? "Temperature deviation detected" : "",
          correctiveAction: isViolation && Math.random() > 0.3 ? "Adjusted thermostat and rechecked in 15 minutes" : "",
        });
      }
    });
  }
  return logs.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

export const seedTemperatureLogs = genLogs();

function genAlerts(): Alert[] {
  const alerts: Alert[] = [];
  const violations = seedTemperatureLogs.filter((l) => !l.isWithinRange);
  const cpMap: Record<string, Checkpoint> = {};
  seedCheckpoints.forEach((c) => (cpMap[c.id] = c));

  violations.slice(0, 25).forEach((log, i) => {
    const cp = cpMap[log.checkpointId];
    if (!cp) return;
    const dev = log.temperature < cp.tempMin ? cp.tempMin - log.temperature : log.temperature - cp.tempMax;
    const severity = dev > 15 ? "critical" : dev > 8 ? "high" : dev > 4 ? "medium" : "low";
    const status = i < 5 ? "open" : i < 15 ? "acknowledged" : "resolved";
    alerts.push({
      id: uuid(),
      facilityId: log.facilityId,
      checkpointId: log.checkpointId,
      temperatureLogId: log.id,
      severity,
      status,
      message: `${cp.name}: ${log.temperature}°${log.unit} outside range ${cp.tempMin}–${cp.tempMax}°${cp.unit}`,
      temperature: log.temperature,
      tempMin: cp.tempMin,
      tempMax: cp.tempMax,
      createdAt: log.recordedAt,
      acknowledgedAt: status !== "open" ? h(Math.random() * 2) : null,
      acknowledgedBy: status !== "open" ? "Admin" : null,
      resolvedAt: status === "resolved" ? h(Math.random()) : null,
    });
  });
  return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const seedAlerts = genAlerts();

function genAudit(): AuditEntry[] {
  const entries: AuditEntry[] = [];
  const actions: { action: AuditAction; entityType: string }[] = [
    { action: "temperature_logged", entityType: "temperature_log" },
    { action: "alert_created", entityType: "alert" },
    { action: "alert_acknowledged", entityType: "alert" },
    { action: "checkpoint_modified", entityType: "checkpoint" },
    { action: "corrective_action_added", entityType: "temperature_log" },
    { action: "report_generated", entityType: "report" },
    { action: "facility_updated", entityType: "facility" },
  ];
  const users = seedUsers;

  for (let i = 0; i < 50; i++) {
    const a = actions[Math.floor(Math.random() * actions.length)];
    const u = users[Math.floor(Math.random() * users.length)];
    entries.push({
      id: uuid(),
      timestamp: h(i * 2 + Math.random() * 2),
      userId: u.id,
      user: u.name,
      action: a.action,
      details: `Performed ${a.action.replace(/_/g, " ")} on ${a.entityType}`,
      entityType: a.entityType,
      entityId: uuid(),
    });
  }
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export const seedAuditLog = genAudit();

function genReports(): ComplianceReport[] {
  return seedFacilities.map((fac) => {
    const facLogs = seedTemperatureLogs.filter((l) => l.facilityId === fac.id);
    const facCps = seedCheckpoints.filter((c) => c.facilityId === fac.id);
    const violations = facLogs.filter((l) => !l.isWithinRange).length;
    const compliant = facCps.filter((cp) => {
      const cpLogs = facLogs.filter((l) => l.checkpointId === cp.id);
      const cpViolations = cpLogs.filter((l) => !l.isWithinRange).length;
      return cpViolations / Math.max(cpLogs.length, 1) < 0.1;
    }).length;
    const score = facLogs.length > 0 ? Math.round(((facLogs.length - violations) / facLogs.length) * 100) : 100;
    return {
      id: uuid(),
      facilityId: fac.id,
      periodStart: d(30),
      periodEnd: now.toISOString(),
      totalCheckpoints: facCps.length,
      compliantCheckpoints: compliant,
      totalReadings: facLogs.length,
      violations,
      complianceScore: score,
      generatedAt: now.toISOString(),
      generatedBy: "System",
    };
  });
}

export const seedReports = genReports();
