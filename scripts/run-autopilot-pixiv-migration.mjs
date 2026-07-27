/**
 * Chạy migration_autopilot_pixiv.sql
 * Usage: npm run migrate:autopilot-pixiv
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
  "../supabase/sql/migration_autopilot_pixiv.sql",
);

const rawUrl =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!rawUrl) {
  console.error("Missing DATABASE_URL / SUPABASE_DB_URL");
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

const password =
  process.env.SUPABASE_DB_PASSWORD?.trim() ||
  process.env.DATABASE_PASSWORD?.trim() ||
  decodeURIComponent(parsedUrl.password || "");

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres({
  host: parsedUrl.hostname,
  port: parsedUrl.port ? Number(parsedUrl.port) : 5432,
  database: parsedUrl.pathname.replace(/^\//, "") || "postgres",
  username: decodeURIComponent(parsedUrl.username),
  password,
  ssl: "require",
  max: 1,
});

try {
  await db.unsafe(sqlText);
  console.log("OK: migration_autopilot_pixiv.sql");
} finally {
  await db.end({ timeout: 5 });
}
