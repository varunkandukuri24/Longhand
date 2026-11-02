/**
 * Clear all rate_limit_hits rows so local or preview testing is not blocked
 * by prior guest create / batch / sign-in limits.
 *
 * Usage: DATABASE_URL=... node scripts/reset-rate-limits.mjs
 */
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });

try {
  const deleted = await client`
    DELETE FROM rate_limit_hits
    RETURNING id
  `;
  console.log(`Deleted ${deleted.length} rate_limit_hits row(s)`);
} finally {
  await client.end({ timeout: 5 });
}
