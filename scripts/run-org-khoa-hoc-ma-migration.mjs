/**
 * Chạy migration_org_khoa_hoc_ma.sql
 * Usage: node scripts/run-org-khoa-hoc-ma-migration.mjs
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
  "../supabase/sql/migration_org_khoa_hoc_ma.sql",
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
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'org_khoa_hoc'
        AND column_name = 'ma_khoa_hoc'`,
  );
  console.log("ok — ma_khoa_hoc:", cols.map((c) => c.column_name).join(", ") || "(missing)");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
