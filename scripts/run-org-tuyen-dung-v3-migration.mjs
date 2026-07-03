/**
 * Chạy migration_org_tuyen_dung_v3_dia_chi_cap_do.sql trên Supabase Postgres.
 * Usage: node scripts/run-org-tuyen-dung-v3-migration.mjs
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
  "../supabase/sql/migration_org_tuyen_dung_v3_dia_chi_cap_do.sql",
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
  console.log("OK: org_tuyen_dung v3 — dia_chi + cap_do text[]");
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
