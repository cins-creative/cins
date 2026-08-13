/**
 * P0 PLAN_analytics_scale — lease + dump hàm cron + DEFAULT partition.
 * Usage: npm run migrate:analytics-p0
 *
 * Đọc DATABASE_URL (pooler) hoặc SUPABASE_DB_URL (direct) từ .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const files = [
  "migration_cins_cron_lease.sql",
  "migration_social_cron_functions.sql",
  "migration_social_partition_an_toan.sql",
];

const url =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL / SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

const db = postgres(url, {
  max: 1,
  connect_timeout: 20,
  ssl: "require",
  prepare: false,
});

try {
  for (const name of files) {
    const sqlPath = path.join(__dirname, "../supabase/sql", name);
    const sqlText = fs.readFileSync(sqlPath, "utf8");
    await db.unsafe(sqlText);
    console.log("OK:", name);
  }
  const [part] = await db.unsafe(
    `SELECT public.social_ensure_partition(3) AS ket`,
  );
  console.log("partition:", part?.ket ?? part);
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
