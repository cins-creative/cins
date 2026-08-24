/**
 * Chạy migration_user_web_push_fcm.sql trên Supabase Postgres.
 * Usage: npm run migrate:user-web-push-fcm
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
  "../supabase/sql/migration_user_web_push_fcm.sql",
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
  await db.unsafe("NOTIFY pgrst, 'reload schema'");
  const cols = await db.unsafe(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_web_push'
        AND column_name IN ('nen_tang','token','mat_hieu_luc_luc','endpoint','p256dh','auth')
      ORDER BY column_name`,
  );
  const count = await db.unsafe(
    `SELECT nen_tang, count(*)::int AS n FROM user_web_push GROUP BY 1`,
  );
  console.log("OK: user_web_push FCM columns");
  console.table(cols);
  console.log("rows by nen_tang:", count);
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
