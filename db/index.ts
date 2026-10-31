import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as typeof globalThis & {
  __longhandPool?: Pool;
};

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({
    connectionString,
    max: process.env.VERCEL ? 5 : 10,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    query_timeout: 15_000,
  });
  if (process.env.VERCEL) {
    attachDatabasePool(pool);
  }
  return pool;
}

const pool = globalForDb.__longhandPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__longhandPool = pool;
}

export const db = drizzle(pool, { schema });
