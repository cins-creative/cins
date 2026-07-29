/**
 * Chạy migration_shop_don_hoan_thanh.sql
 * Usage: node scripts/run-shop-don-hoan-thanh-migration.mjs
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
  "../supabase/sql/migration_shop_don_hoan_thanh.sql",
);

const url =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL / SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(url, {
  max: 1,
  connect_timeout: 15,
  ssl: "require",
  prepare: false,
});

try {
  await db.unsafe(sqlText);
  const labels = await db`
    SELECT enumlabel
    FROM pg_enum
    WHERE enumtypid = 'public.shop_trang_thai_don_enum'::regtype
    ORDER BY enumsortorder
  `;
  const cols = await db`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shop_don_hang'
      AND column_name IN ('hoan_thanh_luc', 'hoan_thanh_boi')
    ORDER BY column_name
  `;
  console.log("OK: shop_trang_thai_don_enum =", labels.map((l) => l.enumlabel));
  console.log("OK: shop_don_hang cột hoàn thành =", cols.map((c) => c.column_name));
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
