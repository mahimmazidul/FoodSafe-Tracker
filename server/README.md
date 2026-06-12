# FoodSafe Tracker — API Server

REST backend for [FoodSafe Tracker](../README.md). Express + TypeScript + SQLite (`better-sqlite3`), JWT auth, role-based permissions, and a full audit trail — designed to match the frontend's data models in `src/store/types.ts` one-to-one.

## Quick Start

```bash
cd server
npm install
npm run dev          # starts on http://localhost:3001 with auto-reload
```

On first start the database is created at `./data/foodsafe.db` and seeded automatically (see [Seed Data](#-seed-data) below).

```bash
# Login and grab a token
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@foodsafe.io","password":"admin123"}'

# Use it
curl -s http://localhost:3001/api/facilities -H "Authorization: Bearer <token>"
```

## 🌱 Seed Data

The seeder (`src/lib/seed.ts`) populates the database with the **same demo fixtures the frontend ships with** in `src/store/seed.ts`, so both sides can be developed against identical data. It runs automatically on first start (when the `users` table is empty) unless `SEED_ON_START=false`, and can also be run manually:

```bash
npm run seed        # no-op if the database already has users
```

### What gets seeded

**Demo accounts** (passwords are bcrypt-hashed; these match the credentials shown on the frontend login page):

| Email | Password | Role | Facility Access |
|---|---|---|---|
| `admin@foodsafe.io` | `admin123` | Super Admin | All 3 facilities |
| `manager@foodsafe.io` | `manager123` | Manager | Downtown Kitchen, Harbor Fresh Market |
| `engineer@foodsafe.io` | `engineer123` | Field Engineer | Downtown Kitchen |

**Facilities** — Downtown Kitchen (Restaurant), Harbor Fresh Market (Market), Sunrise Bakery (Bakery)

**Checkpoints** — 8 monitoring points across the facilities (walk-in cooler/freezer, hot holding station, prep station cooler, seafood display, dairy cooler, dough proofing room, cream filling cooler) with realistic temperature ranges and monitoring frequencies

**Temperature history** — ~480 readings spanning the trailing ~10 days (60 per checkpoint, every ~4h), ~93% compliant with realistic violations. Generated with a **deterministic PRNG**, so reseeding always produces the same demo data.

**Alerts** — auto-derived from the violating readings with correct severity (deviation > 15° critical, > 8° high, > 4° medium, else low); older alerts are mostly resolved/acknowledged, recent ones left open so the dashboard has something to show.

### Resetting the database

```bash
rm -rf data/        # delete the SQLite database
npm run dev         # recreates schema and reseeds on start
```

## 👤 Creating a Superadmin

For production you'll want your own account instead of the demo ones. Set `SEED_ON_START=false`, then:

```bash
npm run create-admin -- --email you@company.com --password yourSecret123 --name "Your Name"

# or via environment variables
ADMIN_EMAIL=you@company.com ADMIN_PASSWORD=yourSecret123 ADMIN_NAME="Your Name" npm run create-admin
```

Behavior:
- Creates a **superadmin** with access to all existing facilities
- If the email **already exists**, the account is promoted to superadmin, re-activated, and the password is reset (so it doubles as a password-recovery tool)
- Password must be ≥ 6 characters

After that, log in via `POST /api/auth/login` and use the token to create the rest of your users through `POST /api/users` (or disable/delete the demo accounts via `PATCH /api/users/:id` with `{"isActive": false}`).

## Configuration

Copy `.env.example` and adjust. Key variables: `PORT` (default `3001`, matching the frontend's `VITE_API_URL`), `JWT_SECRET` (**required in production**), `DB_PATH`, `CORS_ORIGIN`, `SEED_ON_START`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with watch mode (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run seed` | Seed demo data (no-op if already seeded) |
| `npm run create-admin` | Create or reset a superadmin account |
| `npm run typecheck` | Type-check without emitting |

## API Reference

All routes are prefixed with `/api`. Everything except `/auth/login` and `/health` requires `Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| POST | `/auth/logout` | Records logout in audit trail |
| GET | `/auth/me` | Current user from token |

### Users *(manage_users — superadmin)*
| Method | Path | Description |
|---|---|---|
| GET | `/users` | List users |
| POST | `/users` | Create user (`password` required) |
| PATCH | `/users/:id` | Update user (optionally rotate `password`) |
| DELETE | `/users/:id` | Delete user (cannot delete yourself) |

### Facilities
| Method | Path | Description |
|---|---|---|
| GET | `/facilities` · GET `/facilities/:id` | List / fetch |
| POST | `/facilities` | Create *(create_facilities)* |
| PATCH / DELETE | `/facilities/:id` | Update / delete *(edit_facilities)* |

### Checkpoints
| Method | Path | Description |
|---|---|---|
| GET | `/checkpoints?facilityId=` | List (optional filter) |
| POST | `/checkpoints` | Create *(create_checkpoints)* |
| PATCH / DELETE | `/checkpoints/:id` | Update / delete *(edit_checkpoints)* |

### Temperature Logs
| Method | Path | Description |
|---|---|---|
| GET | `/temperature-logs?facilityId=&checkpointId=&from=&to=&limit=` | Query readings |
| POST | `/temperature-logs` | Log a reading — the server computes `isWithinRange` and **auto-creates an alert** when out of range (severity: deviation > 15° critical, > 8° high, > 4° medium, else low). Returns `{ log, alert }`. |
| PATCH | `/temperature-logs/:id/corrective-action` | Attach a corrective action |

### Alerts
| Method | Path | Description |
|---|---|---|
| GET | `/alerts?facilityId=&status=&severity=` | Query alerts |
| POST | `/alerts/:id/acknowledge` | *(acknowledge_alerts)* |
| POST | `/alerts/:id/resolve` | *(resolve_alerts)* |

### Reports
| Method | Path | Description |
|---|---|---|
| GET | `/reports?facilityId=` | List reports |
| POST | `/reports/generate` | `{ facilityId, periodDays? }` — same scoring as frontend |
| GET | `/reports/:id/csv` | Download underlying readings as CSV |

### Audit & Analytics
| Method | Path | Description |
|---|---|---|
| GET | `/audit?userId=&action=&entityType=&from=&to=&limit=` | Audit trail *(view_audit)* |
| GET | `/analytics/summary?facilityId=` | Dashboard counters & compliance scores |
| GET | `/analytics/trends?days=30&facilityId=` | Daily readings/violations *(view_analytics)* |
| GET | `/analytics/checkpoints?facilityId=` | Per-checkpoint violation stats *(view_analytics)* |

## Roles & Permissions

Mirrors `ROLE_PERMISSIONS` on the frontend:

- **superadmin** — everything, including user management
- **manager** — everything except user management & system settings
- **engineer** — view + log temperatures + acknowledge alerts

## Connecting the Frontend

**Already done.** The frontend (`src/services/api.ts` + `src/store/index.ts`) auto-detects this backend on startup via `GET /api/health`:

- **Remote mode** — backend reachable: JWT login (token persisted in `localStorage`, sessions survive page reloads via `GET /auth/me`), all reads/writes through the REST API, server-side audit trail, server-computed compliance and alerts.
- **Offline demo mode** — backend down or `VITE_ENABLE_DEMO_MODE=true`: the original IndexedDB persistence, untouched.

The login page shows which mode is active ("API CONNECTED" / "OFFLINE MODE"). No frontend configuration is required beyond `VITE_API_URL` (defaults to `http://localhost:3001/api`).

## Project Structure

```
server/
├── src/
│   ├── index.ts              # Express app + route mounting
│   ├── types.ts              # Domain types (synced with frontend)
│   ├── lib/
│   │   ├── config.ts         # Env configuration
│   │   ├── db.ts             # SQLite schema + row mappers
│   │   ├── audit.ts          # Audit trail helper
│   │   └── seed.ts           # Demo data seeder
│   ├── middleware/
│   │   ├── auth.ts           # JWT + permission middleware
│   │   └── validate.ts       # Zod body validation
│   └── routes/               # One router per resource
└── data/                     # SQLite database (gitignored)
```
