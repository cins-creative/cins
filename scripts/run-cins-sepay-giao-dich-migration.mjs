/**
 * Chạy migration_cins_sepay_giao_dich.sql (log thô SePay + view đối soát).
 * Usage: npm run migrate:cins-sepay
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
  "../supabase/sql/migration_cins_sepay_giao_dich.sql",
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
console.log("CREATE cins_sepay_giao_dich + view cins_sepay_doi_soat …");

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
      (SELECT to_regclass('public.cins_sepay_giao_dich') IS NOT NULL) AS co_bang,
      (SELECT to_regclass('public.cins_sepay_doi_soat') IS NOT NULL) AS co_view,
      (SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_cins_sepay_giao_dich_sepay'
      )) AS co_uq
  `;
  console.log("OK: cins_sepay_giao_dich migration");
  console.log(
    `Verify — bang=${v.co_bang} view=${v.co_view} uq_sepay=${v.co_uq}`,
  );
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
