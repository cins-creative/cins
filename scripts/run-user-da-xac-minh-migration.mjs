/**
 * Chạy migration_user_da_xac_minh.sql
 * Usage: node scripts/run-user-da-xac-minh-migration.mjs
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
  "../supabase/sql/migration_user_da_xac_minh.sql",
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
  const [official] = await db`
    SELECT slug, ten_hien_thi, da_xac_minh, xac_minh_luc
    FROM public.user_nguoi_dung
    WHERE slug = 'cins_official'
  `;
  console.log("OK: user_nguoi_dung.da_xac_minh + tick CINs_Official");
  console.log(official ?? "(không tìm thấy cins_official)");
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
