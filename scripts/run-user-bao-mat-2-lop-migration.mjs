/**
 * Chạy migration_user_bao_mat_2_lop.sql
 * Usage: node scripts/run-user-bao-mat-2-lop-migration.mjs
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
  "../supabase/sql/migration_user_bao_mat_2_lop.sql",
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
  const cols = await db`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_nguoi_dung'
      AND column_name IN ('so_dien_thoai', 'bao_mat_2_lop_bat', 'so_dien_thoai_xac_minh_luc')
    ORDER BY column_name
  `;
  const [otpTable] = await db`
    SELECT to_regclass('public.auth_otp_dien_thoai') AS reg
  `;
  console.log("OK: migration_user_bao_mat_2_lop applied");
  console.log("Columns on user_nguoi_dung:");
  console.table(cols);
  console.log("auth_otp_dien_thoai:", otpTable?.reg ?? "(missing)");
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
