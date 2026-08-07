/**
 * Chạy migration_billing_tu_khai_lan.sql
 * Usage: npm run migrate:billing-tu-khai
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
  "../supabase/sql/migration_billing_tu_khai_lan.sql",
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
console.log("ALTER cins_hoa_don + tu_khai_lan / tu_khai_boi …");

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
        WHERE table_schema = 'public'
          AND table_name = 'cins_hoa_don'
          AND column_name = 'tu_khai_lan'
      )) AS co_lan,
      (SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cins_hoa_don'
          AND column_name = 'tu_khai_boi'
      )) AS co_boi,
      (SELECT COUNT(*)::int FROM public.cins_hoa_don WHERE tu_khai_lan > 0) AS so_da_tu_khai
  `;
  console.log("OK: billing tu_khai_lan migration");
  console.log(
    `Verify — tu_khai_lan=${v.co_lan} tu_khai_boi=${v.co_boi} da_tu_khai=${v.so_da_tu_khai}`,
  );
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
