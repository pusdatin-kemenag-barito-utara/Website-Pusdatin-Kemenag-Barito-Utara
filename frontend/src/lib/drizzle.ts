import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "./env";
import * as schema from "../db/schema";

const globalForDb = globalThis as unknown as {
  postgresPool: pg.Pool | undefined;
};
// Force reload pool 1

const isProd = process.env.NODE_ENV === "production";

function createPool() {
  return new pg.Pool({
    connectionString: env.databaseUrl,
    max: isProd ? 15 : 10,
    idleTimeoutMillis: isProd ? 30000 : 10000,
    connectionTimeoutMillis: 30000, // Diperpanjang agar antrian tidak cepat timeout
    allowExitOnIdle: !isProd,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
}

const pool = globalForDb.postgresPool ?? createPool();

if (!isProd) {
  globalForDb.postgresPool = pool;
}

pool.on("error", (err) => {
  console.error("[DB] Pool error:", err.message);
});

export const db = drizzle(pool, { schema });
