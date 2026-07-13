/**
 * Chạy migration_user_journey_mac_dinh_view.sql trên Supabase Postgres.
 * Usage: node scripts/run-user-journey-mac-dinh-view-migration.mjs
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
  "../supabase/sql/migration_user_journey_mac_dinh_view.sql",
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
    `SELECT column_name, data_type, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_nguoi_dung'
        AND column_name IN ('journey_mac_dinh_view', 'journey_mac_dinh_ap_dung_toi')
      ORDER BY column_name`,
  );
  console.log("OK: user_nguoi_dung journey default view columns");
  console.table(cols);
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
