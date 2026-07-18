/**
 * Chạy migration_org_su_kien_loai_le_hoi.sql trên Supabase Postgres (CINS).
 * Usage: node scripts/run-org-su-kien-loai-le-hoi-migration.mjs
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
  "../supabase/sql/migration_org_su_kien_loai_le_hoi.sql",
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
  const before = await db.unsafe(`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'loai_su_kien_enum'
    ORDER BY e.enumsortorder
  `);
  console.log("Before:", before.map((r) => r.enumlabel).join(", "));

  await db.unsafe(sqlText);

  const after = await db.unsafe(`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'loai_su_kien_enum'
    ORDER BY e.enumsortorder
  `);
  console.log("After:", after.map((r) => r.enumlabel).join(", "));
  console.log("OK: loai_su_kien_enum += le_hoi");
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
