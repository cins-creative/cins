/**
 * Chạy migration_shop_ship_reverse.sql — gỡ bảng/cột ĐVVC + kho API.
 * Usage: npm run migrate:shop-ship-reverse
 *
 * Giữ snapshot địa chỉ người mua + phí/tranh chấp. Xem SQL header.
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
  "../supabase/sql/migration_shop_ship_reverse.sql",
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

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(rawUrl, {
  max: 1,
  connect_timeout: 15,
  ssl: "require",
  prepare: false,
});

try {
  const names = [
    "shop_van_chuyen_ket_noi",
    "shop_dia_chi_lay",
    "shop_van_don_log",
  ];
  const counts = [];
  for (const name of names) {
    const [{ exists }] = await db.unsafe(
      `SELECT to_regclass('public.${name}') IS NOT NULL AS exists`,
    );
    if (!exists) {
      counts.push({ t: name, n: -1 });
      continue;
    }
    const [{ n }] = await db.unsafe(
      `SELECT count(*)::int AS n FROM public.${name}`,
    );
    counts.push({ t: name, n });
  }
  console.log("Pre-DROP counts (-1 = table missing):", counts);

  await db.unsafe(sqlText);
  console.log("OK: shop ship reverse — DROP ĐVVC/kho/log + cột ship trên đơn");
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
