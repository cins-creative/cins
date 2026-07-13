/**
 * Chạy migration_linh_vuc_thumbnail_nhom.sql trên Supabase Postgres (CINS).
 * Usage: node scripts/run-linh-vuc-thumbnail-nhom-migration.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(
  __dirname,
  "../supabase/sql/migration_linh_vuc_thumbnail_nhom.sql",
);

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(url, { max: 1, ssl: "require" });

try {
  await db.unsafe(sqlText);

  const cols = await db`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'linh_vuc'
      AND column_name IN ('cover_id', 'thumbnail_id', 'nhom')
    ORDER BY column_name
  `;

  const nhomCount = await db`SELECT count(*)::int AS n FROM linh_vuc_nhom`;
  const ganCount = await db`SELECT count(*)::int AS n FROM linh_vuc_gan_nhom`;
  const chinhCount = await db`
    SELECT count(*)::int AS n FROM linh_vuc_gan_nhom WHERE la_chinh = true
  `;

  console.log("OK: migration_linh_vuc_thumbnail_nhom");
  console.log(
    JSON.stringify(
      {
        linh_vuc_cols: cols.map((r) => r.column_name),
        linh_vuc_nhom: nhomCount[0].n,
        linh_vuc_gan_nhom: ganCount[0].n,
        la_chinh: chinhCount[0].n,
      },
      null,
      2,
    ),
  );
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
