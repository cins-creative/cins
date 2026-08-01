/**
 * GRANT EXECUTE RLS helpers cho anon (fix SELECT org_tuyen_dung 42501).
 * Usage: node scripts/run-grant-rls-helpers-anon.mjs
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
  "../supabase/sql/migration_grant_rls_helpers_anon.sql",
);

const url =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(url, { max: 1 });

try {
  await db.unsafe(sqlText);
  console.log("OK: GRANT EXECUTE RLS helpers → anon, authenticated");
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await db.end();
}
