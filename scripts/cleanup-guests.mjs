/**
 * Delete unclaimed guest pieces older than 7 days.
 * Pieces, sessions and batches cascade from guests.
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
    DELETE FROM guests
    WHERE claimed_by IS NULL
      AND created_at < NOW() - INTERVAL '7 days'
    RETURNING id
  `;
  console.log(`Deleted ${deleted.length} unclaimed guest(s)`);
} finally {
  await client.end({ timeout: 5 });
}
