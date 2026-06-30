/**
 * Chạy migration_social_su_kien.sql trên Supabase Postgres.
 * Usage: node scripts/run-su-kien-migration.mjs
 *
 * Đọc DATABASE_URL (pooler) hoặc SUPABASE_DB_URL (direct) từ .env.local.
 * Nếu lỗi "password authentication failed" → cập nhật lại connection string
 * (Supabase Dashboard → Project Settings → Database → Connection string).
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
  "../supabase/sql/migration_social_su_kien.sql",
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
  console.log(
    "OK: loai_su_kien_social_enum + nguon_su_kien_enum + social_luot_xem cols + social_thong_ke_doi_tuong_ngay + social_rollup_su_kien()",
  );
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
