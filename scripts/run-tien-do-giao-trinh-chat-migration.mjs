/**
 * Chạy migration_org_tien_do_giao_trinh_chat.sql
 * Usage: npm run migrate:tien-do-giao-trinh-chat
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
  "../supabase/sql/migration_org_tien_do_giao_trinh_chat.sql",
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
  "CREATE org_tien_do_bai_mo + ALTER org_nop_bai / org_khoa_hoc.dong_bo_tien_do …",
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
      (SELECT count(*)::int FROM public.org_tien_do_bai_mo) AS mo,
      (SELECT count(*)::int
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'org_nop_bai'
          AND column_name = 'luu_luc') AS has_luu,
      (SELECT count(*)::int
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'org_khoa_hoc'
          AND column_name = 'dong_bo_tien_do') AS has_dong_bo
  `;
  console.log("OK: org_tien_do_giao_trinh_chat migration");
  console.log(
    `Verify — mo rows: ${counts.mo}, luu_luc col: ${counts.has_luu}, dong_bo_tien_do col: ${counts.has_dong_bo}`,
  );
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
