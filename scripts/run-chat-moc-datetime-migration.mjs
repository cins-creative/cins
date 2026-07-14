/**
 * Chạy migration_chat_moc_datetime.sql trên Supabase Postgres.
 * Usage: node scripts/run-chat-moc-datetime-migration.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(
  __dirname,
  "../supabase/sql/migration_chat_moc_datetime.sql",
);

const url =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL / SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(url, {
  max: 1,
  connect_timeout: 15,
  ssl: "require",
  prepare: false,
});

try {
  const before = await db`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_moc'
      AND column_name IN ('thoi_diem', 'nhac_truoc_ngay', 'nhac_truoc_phut')
    ORDER BY column_name
  `;
  console.log("before:", before);

  await db.unsafe(sqlText);

  const after = await db`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_moc'
      AND column_name IN ('thoi_diem', 'nhac_truoc_ngay', 'nhac_truoc_phut')
    ORDER BY column_name
  `;
  console.log("after:", after);
  console.log("OK: chat_moc datetime migration");
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
