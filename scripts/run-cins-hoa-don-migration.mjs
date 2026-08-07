/**
 * Chạy migration_cins_hoa_don.sql (P2 hoá đơn hợp nhất).
 * Usage: npm run migrate:cins-hoa-don
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
  "../supabase/sql/migration_cins_hoa_don.sql",
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
console.log(
  "CREATE cins_hoa_don/dong/thanh_toan/phan_bo + ALTER id_hoa_don + cfg shop …",
);

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
      (SELECT to_regclass('public.cins_hoa_don') IS NOT NULL) AS co_hd,
      (SELECT to_regclass('public.cins_hoa_don_dong') IS NOT NULL) AS co_dong,
      (SELECT to_regclass('public.cins_thanh_toan') IS NOT NULL) AS co_tt,
      (SELECT to_regclass('public.cins_phan_bo') IS NOT NULL) AS co_pb,
      (SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='org_phi_dong' AND column_name='id_hoa_don'
      )) AS org_dong_col,
      (SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='shop_phi_dong' AND column_name='id_hoa_don'
      )) AS shop_dong_col
  `;
  console.log("OK: cins_hoa_don migration");
  console.log(
    `Verify — hd=${v.co_hd} dong=${v.co_dong} tt=${v.co_tt} pb=${v.co_pb} · ALTER dong: org=${v.org_dong_col} shop=${v.shop_dong_col}`,
  );
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
