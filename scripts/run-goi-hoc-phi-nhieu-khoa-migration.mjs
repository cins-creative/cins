/**
 * Chạy migration_goi_hoc_phi_nhieu_khoa.sql
 * Usage: node scripts/run-goi-hoc-phi-nhieu-khoa-migration.mjs
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
  "../supabase/sql/migration_goi_hoc_phi_nhieu_khoa.sql",
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
  await db.unsafe(sqlText);
  await db.unsafe("NOTIFY pgrst, 'reload schema'");
  const cols = await db.unsafe(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'org_goi_hoc_phi_khoa'`,
  );
  const n = await db.unsafe(
    `SELECT count(*)::int AS n FROM public.org_goi_hoc_phi_khoa`,
  );
  console.log("OK: org_goi_hoc_phi_khoa");
  console.table(cols);
  console.table(n);
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
