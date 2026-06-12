/**
 * Create (or reset the password of) a superadmin account.
 *
 * Usage:
 *   npm run create-admin -- --email you@company.com --password secret123 --name "Your Name"
 *
 * Or with environment variables:
 *   ADMIN_EMAIL=you@company.com ADMIN_PASSWORD=secret123 ADMIN_NAME="Your Name" npm run create-admin
 *
 * Intended for production setups where SEED_ON_START=false and no demo
 * accounts exist. If the email already exists, the account is promoted to
 * superadmin, re-activated, and its password is reset.
 */
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db, rowToUser } from "./db.js";

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const email = getArg("--email") ?? process.env.ADMIN_EMAIL;
const password = getArg("--password") ?? process.env.ADMIN_PASSWORD;
const nameArg = getArg("--name") ?? process.env.ADMIN_NAME;
const name = nameArg ?? "Administrator";

if (!email || !password) {
  console.error(
    "Usage: npm run create-admin -- --email <email> --password <password> [--name <name>]\n" +
      "   or: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin"
  );
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const avatar = name
  .split(" ")
  .map((p) => p[0])
  .join("")
  .toUpperCase()
  .slice(0, 2);

// Superadmins get access to all facilities.
const allFacilityIds = (db.prepare("SELECT id FROM facilities").all() as any[]).map((f) => f.id);
const hash = bcrypt.hashSync(password, 10);

const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;

if (existing) {
  // Keep the existing name/avatar unless --name was explicitly provided.
  const keepName = nameArg ?? existing.name;
  const keepAvatar = nameArg ? avatar : existing.avatar;
  db.prepare(
    `UPDATE users SET role = 'superadmin', is_active = 1, password_hash = ?,
       name = ?, avatar = ?, facility_ids = ?
     WHERE email = ?`
  ).run(hash, keepName, keepAvatar, JSON.stringify(allFacilityIds), email);
  console.log(`Updated existing account → superadmin: ${email}`);
} else {
  db.prepare(
    `INSERT INTO users (id, email, name, role, avatar, facility_ids, password_hash, created_at, last_login, is_active)
     VALUES (?, ?, ?, 'superadmin', ?, ?, ?, ?, NULL, 1)`
  ).run(uuid(), email, name, avatar, JSON.stringify(allFacilityIds), hash, new Date().toISOString());
  console.log(`Created superadmin: ${email}`);
}

const user = rowToUser(db.prepare("SELECT * FROM users WHERE email = ?").get(email));
console.log(JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role }, null, 2));
