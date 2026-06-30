/**
 * Chạy migration_social_bao_cao.sql trên Supabase Postgres.
 * Usage: node scripts/run-bao-cao-migration.mjs
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
  "../supabase/sql/migration_social_bao_cao.sql",
);

const url =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL / SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

const u = new URL(url);
const password =
  process.env.SUPABASE_DB_PASSWORD?.trim() ||
  process.env.DATABASE_PASSWORD?.trim() ||
  decodeURIComponent(u.password || "");

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres({
  host: u.hostname,
  port: u.port ? Number(u.port) : 5432,
  database: u.pathname.replace(/^\//, "") || "postgres",
  username: decodeURIComponent(u.username),
  password,
  max: 1,
  connect_timeout: 15,
  ssl: u.hostname.includes("supabase.co") || u.hostname.includes("supabase.com") ? "require" : undefined,
});

try {
  await db.unsafe(sqlText);
  console.log("OK: social_bao_cao + loai_bao_cao_enum + trang_thai_bao_cao_enum");
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
