/**
 * Chạy migration_hoc_phi_combo.sql (A18 + combo + nhóm đơn A19 + RPC).
 * Usage: node scripts/run-hoc-phi-combo-migration.mjs
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
  "../supabase/sql/migration_hoc_phi_combo.sql",
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
  const tables = await db.unsafe(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'org_combo_hoc_phi',
          'org_combo_thanh_phan',
          'org_nhom_don_hoc_phi'
        )
      ORDER BY table_name`,
  );
  const cols = await db.unsafe(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'org_don_hoc_phi'
        AND column_name IN ('id_nhom', 'gia_goc_vnd', 'giam_vnd')
      ORDER BY column_name`,
  );
  console.log("OK: migration_hoc_phi_combo");
  console.table(tables);
  console.table(cols);
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
