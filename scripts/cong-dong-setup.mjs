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
  "supabase/sql/migration_cong_dong.sql",
);
const legacyPath = path.join(
  process.cwd(),
  "supabase/sql/migration_content_thao_luan.sql",
);
const sqlFile = fs.existsSync(migrationPath) ? migrationPath : legacyPath;
const migrationSql = fs.readFileSync(sqlFile, "utf8");

const db = postgres(url, { max: 1 });

try {
  console.log("Running migration from", path.basename(sqlFile));
  await db.unsafe(migrationSql);

  const owners = await db`
    SELECT DISTINCT m.id_nguoi_dung, u.slug, u.ten_hien_thi
    FROM user_thanh_vien_to_chuc m
    JOIN user_nguoi_dung u ON u.id = m.id_nguoi_dung
    WHERE m.vai_tro = 'owner'
    LIMIT 5
  `;
  console.log("CINS owner candidates:", owners);

  const cols = await db`
    SELECT table_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'loai_doi_tuong'
      AND table_name IN ('social_reaction', 'social_binh_luan')
  `;
  console.log("loai_doi_tuong columns:", cols);

  const tables = await db`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('content_thao_luan', 'content_thao_luan_media')
  `;
  console.log("Tables ready:", tables.map((t) => t.table_name).join(", "));
} finally {
  await db.end();
}
