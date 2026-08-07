/**
 * Chạy migration_cins_tk_thanh_toan.sql (P1 billing account).
 * Usage: node scripts/run-cins-tk-thanh-toan-migration.mjs
 *        npm run migrate:cins-tk-thanh-toan
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
  "../supabase/sql/migration_cins_tk_thanh_toan.sql",
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
  "CREATE cins_tk_thanh_toan + cins_dich_vu + cins_tk_nguoi_phu_trach + RLS …",
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
      (SELECT to_regclass('public.cins_tk_thanh_toan') IS NOT NULL) AS co_tk,
      (SELECT to_regclass('public.cins_dich_vu') IS NOT NULL) AS co_dv,
      (SELECT to_regclass('public.cins_tk_nguoi_phu_trach') IS NOT NULL) AS co_pt,
      (SELECT relrowsecurity FROM pg_class WHERE relname = 'cins_tk_thanh_toan' AND relnamespace = 'public'::regnamespace) AS rls_tk,
      (SELECT relrowsecurity FROM pg_class WHERE relname = 'cins_dich_vu' AND relnamespace = 'public'::regnamespace) AS rls_dv,
      (SELECT count(*)::int FROM public.cins_tk_thanh_toan) AS n_tk,
      (SELECT count(*)::int FROM public.cins_dich_vu) AS n_dv
  `;
  console.log("OK: cins_tk_thanh_toan migration");
  console.log(
    `Verify — tables: tk=${counts.co_tk} dv=${counts.co_dv} pt=${counts.co_pt} · RLS: tk=${counts.rls_tk} dv=${counts.rls_dv} · rows: tk=${counts.n_tk} dv=${counts.n_dv}`,
  );
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
