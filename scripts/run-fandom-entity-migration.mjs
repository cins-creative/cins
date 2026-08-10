/**
 * Chạy migration_fandom_entity.sql trên CINS production.
 * Usage: node scripts/run-fandom-entity-migration.mjs
 *        npm run migrate:fandom-entity
 *
 * ADD VALUE enum + CREATE shop_nhom_fandom + ẩn facet fandom.
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
  "../supabase/sql/migration_fandom_entity.sql",
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
      (
        SELECT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public'
            AND t.typname = 'loai_bai_viet_enum'
            AND e.enumlabel = 'fandom'
        )
      ) AS has_fandom_enum,
      (
        SELECT count(*)::int
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'shop_nhom_fandom'
      ) AS shop_nhom_fandom_table,
      (
        SELECT trang_thai
        FROM public.shop_thuoc_tinh
        WHERE slug = 'fandom'
        LIMIT 1
      ) AS fandom_facet_status
  `;
  console.log("OK: fandom entity migration applied");
  console.log(JSON.stringify(counts[0], null, 2));
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
