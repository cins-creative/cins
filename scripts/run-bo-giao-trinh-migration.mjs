/**
 * Chạy migration_org_bo_giao_trinh.sql (bộ giáo trình MM + ALTER org_bai_tap/org_khoa_hoc).
 * Usage: node scripts/run-bo-giao-trinh-migration.mjs
 *        npm run migrate:bo-giao-trinh
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
  "../supabase/sql/migration_org_bo_giao_trinh.sql",
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
  "CREATE org_bo_giao_trinh + org_giao_trinh_bai + ALTER org_bai_tap/org_khoa_hoc + backfill …",
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
      (SELECT count(*)::int FROM public.org_bo_giao_trinh) AS bo,
      (SELECT count(*)::int FROM public.org_giao_trinh_bai) AS gan,
      (SELECT count(*)::int FROM public.org_khoa_hoc WHERE id_bo_giao_trinh IS NOT NULL) AS khoa_co_bo,
      (SELECT count(*)::int FROM public.org_bai_tap WHERE id_to_chuc IS NOT NULL) AS module
  `;
  console.log("OK: org_bo_giao_trinh migration");
  console.log(
    `Verify — bộ: ${counts.bo}, gán: ${counts.gan}, khóa có bộ: ${counts.khoa_co_bo}, module có org: ${counts.module}`,
  );
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
