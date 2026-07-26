/**
 * Chạy migration_drop_giai_doan_moi_bat_dau.sql trên Supabase Postgres.
 * Usage: node scripts/run-drop-giai-doan-moi-bat-dau-migration.mjs
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
  "../supabase/sql/migration_drop_giai_doan_moi_bat_dau.sql",
);

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(url, { max: 1 });

try {
  await db.unsafe(sqlText);
  const labels = await db`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'giai_doan_enum'
    ORDER BY e.enumsortorder
  `;
  console.log(
    "OK: giai_doan_enum =",
    labels.map((r) => r.enumlabel).join(", "),
  );

  const [{ count }] = await db`
    SELECT count(*)::int AS count
    FROM public.user_nguoi_dung
    WHERE giai_doan::text = 'moi_bat_dau'
  `;
  console.log("users still moi_bat_dau:", count);
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
