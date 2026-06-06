import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const migrationPath = path.join(
  process.cwd(),
  "supabase/sql/migration_cong_dong_filter.sql",
);
const migrationSql = fs.readFileSync(migrationPath, "utf8");
const db = postgres(url, { max: 1 });

try {
  console.log("Running", path.basename(migrationPath));
  await db.unsafe(migrationSql);

  const tables = await db`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('content_thao_luan_filter', 'content_thao_luan_filter_gan')
  `;
  console.log("Tables ready:", tables.map((t) => t.table_name).join(", "));
} finally {
  await db.end();
}
