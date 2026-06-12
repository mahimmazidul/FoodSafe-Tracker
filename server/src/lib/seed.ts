/**
 * Seed script — populates the database with the same demo data the
 * frontend ships with (see src/store/seed.ts), so both sides can be
 * developed against identical fixtures.
 *
 * Run with: npm run seed
 * (Also runs automatically on first server start unless SEED_ON_START=false.)
 */
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "./db.js";

export function isSeeded(): boolean {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users").get() as any;
  return row.n > 0;
}

export function seed(): void {
  if (isSeeded()) {
    console.log("Database already seeded — skipping.");
    return;
  }

  const now = Date.now();
  const h = (hours: number) => new Date(now - hours * 3600000).toISOString();
  const d = (days: number) => new Date(now - days * 86400000).toISOString();

  const adminId = uuid();
  const managerId = uuid();
  const engineerId = uuid();

  const fac1 = uuid();
  const fac2 = uuid();
  const fac3 = uuid();

  const insertUser = db.prepare(
    `INSERT INTO users (id, email, name, role, avatar, facility_ids, password_hash, created_at, last_login, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );
  insertUser.run(adminId, "admin@foodsafe.io", "Alex Johnson", "superadmin", "AJ",
    JSON.stringify([fac1, fac2, fac3]), bcrypt.hashSync("admin123", 10), d(180), h(2));
  insertUser.run(managerId, "manager@foodsafe.io", "Sarah Chen", "manager", "SC",
    JSON.stringify([fac1, fac2]), bcrypt.hashSync("manager123", 10), d(90), h(5));
  insertUser.run(engineerId, "engineer@foodsafe.io", "Mike Torres", "engineer", "MT",
    JSON.stringify([fac1]), bcrypt.hashSync("engineer123", 10), d(30), h(1));

  const insertFacility = db.prepare(
    "INSERT INTO facilities (id, name, address, type, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  insertFacility.run(fac1, "Downtown Kitchen", "123 Main St, Portland, OR 97201", "Restaurant", d(90));
  insertFacility.run(fac2, "Harbor Fresh Market", "456 Dock Ave, Portland, OR 97209", "Market", d(60));
  insertFacility.run(fac3, "Sunrise Bakery", "789 Oak Ln, Portland, OR 97214", "Bakery", d(30));

  const checkpoints: Array<{
    id: string;
    facilityId: string;
    name: string;
    hazardType: string;
    frequency: string;
    min: number;
    max: number;
  }> = [
    { id: uuid(), facilityId: fac1, name: "Walk-in Cooler", hazardType: "biological", frequency: "every-2-hours", min: 33, max: 41 },
    { id: uuid(), facilityId: fac1, name: "Walk-in Freezer", hazardType: "biological", frequency: "every-4-hours", min: -10, max: 0 },
    { id: uuid(), facilityId: fac1, name: "Hot Holding Station", hazardType: "biological", frequency: "hourly", min: 135, max: 165 },
    { id: uuid(), facilityId: fac1, name: "Prep Station Cooler", hazardType: "biological", frequency: "every-2-hours", min: 33, max: 41 },
    { id: uuid(), facilityId: fac2, name: "Seafood Display Case", hazardType: "biological", frequency: "hourly", min: 28, max: 38 },
    { id: uuid(), facilityId: fac2, name: "Dairy Cooler", hazardType: "biological", frequency: "every-2-hours", min: 33, max: 41 },
    { id: uuid(), facilityId: fac3, name: "Dough Proofing Room", hazardType: "biological", frequency: "every-4-hours", min: 75, max: 85 },
    { id: uuid(), facilityId: fac3, name: "Cream Filling Cooler", hazardType: "allergen", frequency: "every-2-hours", min: 33, max: 41 },
  ];

  const insertCp = db.prepare(
    `INSERT INTO checkpoints (id, facility_id, name, hazard_type, monitoring_frequency, temp_min, temp_max, unit, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'F', 'active', ?)`
  );
  for (const cp of checkpoints) {
    insertCp.run(cp.id, cp.facilityId, cp.name, cp.hazardType, cp.frequency, cp.min, cp.max, d(28));
  }

  // Generate ~10 days of readings per checkpoint, mostly compliant with
  // occasional violations (mirrors the frontend's seeded distribution).
  const recorders = ["Alex Johnson", "Sarah Chen", "Mike Torres"];
  const insertLog = db.prepare(
    `INSERT INTO temperature_logs (id, checkpoint_id, facility_id, temperature, unit, is_within_range, recorded_by, recorded_at, notes, corrective_action)
     VALUES (?, ?, ?, ?, 'F', ?, ?, ?, ?, ?)`
  );
  const insertAlert = db.prepare(
    `INSERT INTO alerts (id, facility_id, checkpoint_id, temperature_log_id, severity, status, message, temperature, temp_min, temp_max, created_at, acknowledged_at, acknowledged_by, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let seededRandomState = 42;
  const rand = () => {
    // Deterministic PRNG so reseeding produces stable demo data.
    seededRandomState = (seededRandomState * 1103515245 + 12345) % 2147483648;
    return seededRandomState / 2147483648;
  };

  for (const cp of checkpoints) {
    for (let i = 0; i < 60; i++) {
      const hoursAgo = i * 4 + rand() * 2;
      const recordedAt = h(hoursAgo);
      const range = cp.max - cp.min;
      const violate = rand() < 0.07;

      let temperature: number;
      if (violate) {
        const overshoot = 2 + rand() * 18;
        temperature = rand() < 0.5 ? cp.min - overshoot : cp.max + overshoot;
      } else {
        temperature = cp.min + rand() * range;
      }
      temperature = Math.round(temperature * 10) / 10;

      const isWithin = temperature >= cp.min && temperature <= cp.max;
      const logId = uuid();
      const recorder = recorders[Math.floor(rand() * recorders.length)];

      insertLog.run(
        logId, cp.id, cp.facilityId, temperature, isWithin ? 1 : 0,
        recorder, recordedAt,
        isWithin ? "" : "Reading out of range",
        isWithin ? "" : (rand() < 0.6 ? "Adjusted thermostat and re-checked after 30 minutes" : "")
      );

      if (!isWithin) {
        const dev = temperature < cp.min ? cp.min - temperature : temperature - cp.max;
        const severity = dev > 15 ? "critical" : dev > 8 ? "high" : dev > 4 ? "medium" : "low";
        const resolved = hoursAgo > 24 && rand() < 0.8;
        const acknowledged = resolved || rand() < 0.5;

        insertAlert.run(
          uuid(), cp.facilityId, cp.id, logId, severity,
          resolved ? "resolved" : acknowledged ? "acknowledged" : "open",
          `${cp.name}: ${temperature}°F outside range ${cp.min}–${cp.max}°F`,
          temperature, cp.min, cp.max, recordedAt,
          acknowledged ? h(hoursAgo - 0.5) : null,
          acknowledged ? recorder : null,
          resolved ? h(hoursAgo - 1) : null
        );
      }
    }
  }

  db.prepare(
    `INSERT INTO audit_log (id, timestamp, user_id, user_name, action, details, entity_type, entity_id)
     VALUES (?, ?, ?, ?, 'user_created', 'Initial database seed', 'system', 'seed')`
  ).run(uuid(), new Date().toISOString(), "system", "System");

  console.log("Seeded database:");
  console.log("  admin@foodsafe.io    / admin123    (superadmin)");
  console.log("  manager@foodsafe.io  / manager123  (manager)");
  console.log("  engineer@foodsafe.io / engineer123 (engineer)");
}

// Allow running directly: `npm run seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}
