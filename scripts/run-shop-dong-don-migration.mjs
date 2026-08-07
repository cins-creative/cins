/**
 * Chạy migration_shop_dong_don_p3.sql (P3a đóng đơn shop).
 * Usage: npm run migrate:shop-dong-don
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const EXPECTED_PROJECT_REF = "ospzzzxcomrmhqrnkoiw";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(
  __dirname,
  "../supabase/sql/migration_shop_dong_don_p3.sql",
);

const rawUrl =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!rawUrl) {
  console.error("Missing DATABASE_URL / SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

const parsedUrl = new URL(rawUrl);
const isExpectedProject =
  parsedUrl.hostname.includes(EXPECTED_PROJECT_REF) ||
  parsedUrl.username.includes(EXPECTED_PROJECT_REF);
if (!isExpectedProject) {
  console.error(
    `Refusing migration: target is not CINS ${EXPECTED_PROJECT_REF}.`,
  );
  process.exit(1);
}

console.log(`Target project: CINS ${EXPECTED_PROJECT_REF}`);
console.log("ALTER shop_don_hang + cins_cau_hinh (P3a đóng đơn) …");

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(rawUrl, {
  max: 1,
  connect_timeout: 15,
  ssl: "require",
  prepare: false,
});

try {
  await db.unsafe(sqlText);
  const [v] = await db`
    SELECT
      (SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='shop_don_hang'
          AND column_name='khao_sat_luc'
      )) AS don_col,
      (SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='cins_cau_hinh_tai_chinh'
          AND column_name='shop_ngay_tu_dong_su_kien'
      )) AS cfg_col
  `;
  console.log("OK: shop_dong_don_p3 migration");
  console.log(`Verify — don.khao_sat_luc=${v.don_col} cfg.tu_dong=${v.cfg_col}`);
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
