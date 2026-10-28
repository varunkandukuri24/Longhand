import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type PostgresClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as typeof globalThis & {
  __longhandPostgres?: PostgresClient;
};

function createClient(): PostgresClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // Neon pooled URLs (PgBouncer) cannot use prepared statements.
  return postgres(connectionString, {
    max: process.env.VERCEL ? 1 : 10,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

const client = globalForDb.__longhandPostgres ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__longhandPostgres = client;
}

export const db = drizzle(client, { schema });
