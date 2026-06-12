import express from "express";
import cors from "cors";
import { config } from "./lib/config.js";
import { seed } from "./lib/seed.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { facilitiesRouter } from "./routes/facilities.js";
import { checkpointsRouter } from "./routes/checkpoints.js";
import { temperatureLogsRouter } from "./routes/temperatureLogs.js";
import { alertsRouter } from "./routes/alerts.js";
import { reportsRouter } from "./routes/reports.js";
import { auditRouter } from "./routes/audit.js";
import { analyticsRouter } from "./routes/analytics.js";

const app = express();

app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",") }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/facilities", facilitiesRouter);
app.use("/api/checkpoints", checkpointsRouter);
app.use("/api/temperature-logs", temperatureLogsRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/audit", auditRouter);
app.use("/api/analytics", analyticsRouter);

// 404 + error handlers
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

if (config.seedOnStart) {
  seed();
}

app.listen(config.port, () => {
  console.log(`FoodSafe Tracker API listening on http://localhost:${config.port}`);
  console.log(`Health check: http://localhost:${config.port}/api/health`);
});
