// Shared domain types — kept in sync with src/store/types.ts on the frontend.

export type HazardType = "biological" | "chemical" | "physical" | "allergen";
export type Severity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export type TemperatureUnit = "F" | "C";
export type CheckpointStatus = "active" | "inactive";
export type MonitoringFrequency =
  | "hourly"
  | "every-2-hours"
  | "every-4-hours"
  | "daily"
  | "weekly";
export type UserRole = "superadmin" | "manager" | "engineer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar: string;
  facilityIds: string[];
  createdAt: string;
  lastLogin: string | null;
  isActive: boolean;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  type: string;
  createdAt: string;
}

export interface Checkpoint {
  id: string;
  facilityId: string;
  name: string;
  hazardType: HazardType;
  monitoringFrequency: MonitoringFrequency;
  tempMin: number;
  tempMax: number;
  unit: TemperatureUnit;
  status: CheckpointStatus;
  createdAt: string;
}

export interface TemperatureLog {
  id: string;
  checkpointId: string;
  facilityId: string;
  temperature: number;
  unit: TemperatureUnit;
  isWithinRange: boolean;
  recordedBy: string;
  recordedAt: string;
  notes: string;
  correctiveAction: string;
}

export interface Alert {
  id: string;
  facilityId: string;
  checkpointId: string;
  temperatureLogId: string;
  severity: Severity;
  status: AlertStatus;
  message: string;
  temperature: number;
  tempMin: number;
  tempMax: number;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
}

export type AuditAction =
  | "user_login"
  | "user_logout"
  | "temperature_logged"
  | "alert_created"
  | "alert_acknowledged"
  | "alert_resolved"
  | "checkpoint_created"
  | "checkpoint_modified"
  | "corrective_action_added"
  | "report_generated"
  | "facility_created"
  | "facility_updated"
  | "user_created"
  | "user_updated"
  | "user_deleted";

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  user: string;
  action: AuditAction;
  details: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
}

export interface ComplianceReport {
  id: string;
  facilityId: string;
  periodStart: string;
  periodEnd: string;
  totalCheckpoints: number;
  compliantCheckpoints: number;
  totalReadings: number;
  violations: number;
  complianceScore: number;
  generatedAt: string;
  generatedBy: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  superadmin: [
    "view_dashboard",
    "log_temperature",
    "view_checkpoints",
    "create_checkpoints",
    "edit_checkpoints",
    "view_facilities",
    "create_facilities",
    "edit_facilities",
    "view_alerts",
    "acknowledge_alerts",
    "resolve_alerts",
    "view_reports",
    "generate_reports",
    "view_analytics",
    "view_audit",
    "manage_users",
    "system_settings",
  ],
  manager: [
    "view_dashboard",
    "log_temperature",
    "view_checkpoints",
    "create_checkpoints",
    "edit_checkpoints",
    "view_facilities",
    "create_facilities",
    "edit_facilities",
    "view_alerts",
    "acknowledge_alerts",
    "resolve_alerts",
    "view_reports",
    "generate_reports",
    "view_analytics",
    "view_audit",
  ],
  engineer: [
    "view_dashboard",
    "log_temperature",
    "view_checkpoints",
    "view_facilities",
    "view_alerts",
    "acknowledge_alerts",
  ],
};
