/**
 * P3 PLAN_analytics_scale — social_dem_doi_tuong + backfill từ rollup ngày.
 * Usage: npm run migrate:analytics-p3
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL / SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

const db = postgres(url, {
  max: 1,
  connect_timeout: 20,
  ssl: "require",
  prepare: false,
});

try {
  const sqlPath = path.join(
    __dirname,
    "../supabase/sql/migration_social_dem_doi_tuong.sql",
  );
  await db.unsafe(fs.readFileSync(sqlPath, "utf8"));
  console.log("OK: migration_social_dem_doi_tuong.sql");

  const [n] = await db.unsafe(
    `SELECT public.social_rollup_dem_doi_tuong() AS n`,
  );
  console.log("dem_doi_tuong upserted:", n?.n);

  const [chk] = await db.unsafe(`
    SELECT
      count(*)::bigint AS rows,
      coalesce(sum(luot_tiep_can), 0)::bigint AS luot,
      coalesce(sum(nguoi_tiep_can), 0)::bigint AS nguoi
    FROM public.social_dem_doi_tuong
  `);
  console.log("counts", chk);
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
