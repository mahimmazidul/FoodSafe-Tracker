import { v4 as uuid } from "uuid";
import { db } from "./db.js";
import type { AuditAction, User } from "../types.js";

interface AuditInput {
  action: AuditAction;
  details: string;
  entityType: string;
  entityId: string;
  user?: Pick<User, "id" | "name"> | null;
  ipAddress?: string;
}

const insert = db.prepare(`
  INSERT INTO audit_log (id, timestamp, user_id, user_name, action, details, entity_type, entity_id, ip_address)
  VALUES (@id, @timestamp, @userId, @userName, @action, @details, @entityType, @entityId, @ipAddress)
`);

export function recordAudit(input: AuditInput): void {
  insert.run({
    id: uuid(),
    timestamp: new Date().toISOString(),
    userId: input.user?.id ?? "system",
    userName: input.user?.name ?? "System",
    action: input.action,
    details: input.details,
    entityType: input.entityType,
    entityId: input.entityId,
    ipAddress: input.ipAddress ?? null,
  });
}
