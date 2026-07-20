/**
 * Chạy migration_chat_canvas.sql (L34 — Canvas ý tưởng nhóm chat)
 * Usage: node scripts/run-chat-canvas-migration.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "../supabase/sql/migration_chat_canvas.sql");

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
  console.log("OK: chat_canvas + chat_canvas_node + chat_canvas_tin_an (RLS + trigger)");
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
