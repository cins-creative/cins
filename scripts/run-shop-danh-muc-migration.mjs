/**
 * Chạy migration_shop_danh_muc.sql trên CINS production.
 * Usage: node scripts/run-shop-danh-muc-migration.mjs
 *        npm run migrate:shop-danh-muc
 *
 * Plan: docs/PLAN_shop_danh_muc_san_pham.md
 * ALTER shop_nhom: id_danh_muc + danh_muc_xac_nhan (đã duyệt §11.7).
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
  "../supabase/sql/migration_shop_danh_muc.sql",
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

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(rawUrl, {
  max: 1,
  connect_timeout: 15,
  ssl: "require",
  prepare: false,
});

try {
  await db.unsafe(sqlText);
  const counts = await db`
    SELECT
      (SELECT count(*)::int FROM public.shop_danh_muc) AS danh_muc,
      (SELECT count(*)::int FROM public.shop_danh_muc_alias) AS danh_muc_alias,
      (SELECT count(*)::int FROM public.shop_thuoc_tinh) AS thuoc_tinh,
      (SELECT count(*)::int FROM public.shop_thuoc_tinh_gia_tri) AS gia_tri,
      (SELECT count(*)::int FROM public.shop_thuoc_tinh_alias) AS gia_tri_alias,
      (
        SELECT count(*)::int
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'shop_nhom'
          AND column_name IN ('id_danh_muc', 'danh_muc_xac_nhan')
      ) AS shop_nhom_cols
  `;
  console.log("OK: shop taxonomy migration applied");
  console.log(JSON.stringify(counts[0], null, 2));
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
