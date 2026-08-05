/**
 * Chạy migration_csdt_phi_nen_tang.sql (A-1: 5 bảng phí nền tảng CSĐT).
 * Usage: node scripts/run-csdt-phi-nen-tang-migration.mjs
 *        npm run migrate:csdt-phi
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
  "../supabase/sql/migration_csdt_phi_nen_tang.sql",
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
  "CREATE cins_cau_hinh_tai_chinh + org_phi_ky/dong/thanh_toan/khieu_nai + RLS + seed …",
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

  const [counts] = await db`
    SELECT
      (SELECT count(*)::int FROM public.cins_cau_hinh_tai_chinh) AS cau_hinh,
      (SELECT csdt_ty_le::text FROM public.cins_cau_hinh_tai_chinh ORDER BY cap_nhat_luc DESC LIMIT 1) AS ty_le,
      (SELECT csdt_nguong_kich_hoat_vnd::text FROM public.cins_cau_hinh_tai_chinh ORDER BY cap_nhat_luc DESC LIMIT 1) AS nguong,
      (SELECT to_regclass('public.org_phi_ky') IS NOT NULL) AS co_ky,
      (SELECT to_regclass('public.org_phi_dong') IS NOT NULL) AS co_dong,
      (SELECT to_regclass('public.org_phi_thanh_toan') IS NOT NULL) AS co_tt,
      (SELECT to_regclass('public.org_phi_khieu_nai') IS NOT NULL) AS co_kn,
      (SELECT relrowsecurity FROM pg_class WHERE relname = 'cins_cau_hinh_tai_chinh' AND relnamespace = 'public'::regnamespace) AS rls_cfg,
      (SELECT relrowsecurity FROM pg_class WHERE relname = 'org_phi_ky' AND relnamespace = 'public'::regnamespace) AS rls_ky
  `;
  console.log("OK: csdt_phi_nen_tang migration");
  console.log(
    `Verify — cau_hinh: ${counts.cau_hinh} (ty_le=${counts.ty_le}, nguong=${counts.nguong}) · tables: ky=${counts.co_ky} dong=${counts.co_dong} tt=${counts.co_tt} kn=${counts.co_kn} · RLS: cfg=${counts.rls_cfg} ky=${counts.rls_ky}`,
  );
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
