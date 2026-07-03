/**
 * Chạy migration_org_tuyen_dung_phuc_loi.sql trên Supabase Postgres.
 * Usage: node scripts/run-org-tuyen-dung-phuc-loi-migration.mjs
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
  "../supabase/sql/migration_org_tuyen_dung_phuc_loi.sql",
);

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(url, { max: 1 });

try {
  await db.unsafe(sqlText);
  console.log("OK: org_tuyen_dung.phuc_loi (phúc lợi có cấu trúc)");
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
