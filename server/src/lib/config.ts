import path from "node:path";

const env = process.env;

export const config = {
  port: Number(env.PORT) || 3001,
  jwtSecret: env.JWT_SECRET || "dev-secret-change-me-in-production",
  jwtExpiresIn: env.JWT_EXPIRES_IN || "12h",
  dbPath: env.DB_PATH || path.join(process.cwd(), "data", "foodsafe.db"),
  corsOrigin: env.CORS_ORIGIN || "*",
  seedOnStart: env.SEED_ON_START !== "false",
};

if (
  env.NODE_ENV === "production" &&
  config.jwtSecret === "dev-secret-change-me-in-production"
) {
  // eslint-disable-next-line no-console
  console.warn(
    "[WARN] Running in production with the default JWT secret. Set JWT_SECRET!"
  );
}
