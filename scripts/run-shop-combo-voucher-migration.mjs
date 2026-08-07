/**
 * Chạy migration combo + voucher + ALTER shop_don_hang (giam gia).
 * Usage: npm run migrate:shop-combo-voucher
 *
 * Thứ tự: migration_shop_combo_voucher.sql → migration_shop_don_giam_gia.sql
 * (ALTER cần FK → shop_voucher).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const EXPECTED_PROJECT_REF = "ospzzzxcomrmhqrnkoiw";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = [
  "migration_shop_combo_voucher.sql",
  "migration_shop_don_giam_gia.sql",
];

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

const db = postgres(rawUrl, {
  max: 1,
  connect_timeout: 20,
  ssl: "require",
  prepare: false,
});

try {
  for (const name of files) {
    const sqlPath = path.join(__dirname, "../supabase/sql", name);
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Missing SQL file: ${sqlPath}`);
    }
    console.log(`Applying ${name} …`);
    const sqlText = fs.readFileSync(sqlPath, "utf8");
    await db.unsafe(sqlText);
    console.log(`OK: ${name}`);
  }

  const [v] = await db`
    SELECT
      (SELECT to_regclass('public.shop_combo') IS NOT NULL) AS shop_combo,
      (SELECT to_regclass('public.shop_combo_dieu_kien') IS NOT NULL) AS shop_combo_dieu_kien,
      (SELECT to_regclass('public.shop_voucher') IS NOT NULL) AS shop_voucher,
      (SELECT to_regclass('public.shop_voucher_su_dung') IS NOT NULL) AS shop_voucher_su_dung,
      (SELECT to_regclass('public.shop_voucher_luu') IS NOT NULL) AS shop_voucher_luu,
      (SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'shop_don_hang'
          AND column_name = 'tong_hang'
      )) AS don_tong_hang,
      (SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'shop_don_hang'
          AND column_name = 'tien_giam_voucher'
      )) AS don_tien_giam_voucher,
      (SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'shop_dung_voucher'
      )) AS rpc_dung_voucher,
      (SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'shop_hoan_voucher'
      )) AS rpc_hoan_voucher
  `;

  console.log("Verify:");
  console.log(
    `  tables: combo=${v.shop_combo} dieu_kien=${v.shop_combo_dieu_kien} voucher=${v.shop_voucher} su_dung=${v.shop_voucher_su_dung} luu=${v.shop_voucher_luu}`,
  );
  console.log(
    `  don_hang: tong_hang=${v.don_tong_hang} tien_giam_voucher=${v.don_tien_giam_voucher}`,
  );
  console.log(
    `  rpc: dung_voucher=${v.rpc_dung_voucher} hoan_voucher=${v.rpc_hoan_voucher}`,
  );

  const ok =
    v.shop_combo &&
    v.shop_combo_dieu_kien &&
    v.shop_voucher &&
    v.shop_voucher_su_dung &&
    v.shop_voucher_luu &&
    v.don_tong_hang &&
    v.don_tien_giam_voucher &&
    v.rpc_dung_voucher &&
    v.rpc_hoan_voucher;
  if (!ok) {
    throw new Error("Verify failed — một số object chưa có sau migration.");
  }
  console.log("OK: shop combo & voucher migration complete");
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
