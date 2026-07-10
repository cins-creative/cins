/**
 * Chuẩn hoá URL .riv trong DB.
 *
 *   node --env-file=.env.local scripts/run-rive-asset-url-migration.mjs
 *   node --env-file=.env.local scripts/run-rive-asset-url-migration.mjs --hotfix
 *
 * Mặc định: path tương đối (sau khi deploy code đọc /api/rive-asset/...).
 * --hotfix: https://cins.vn/... cho production chưa deploy code mới.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const hotfix = process.argv.includes("--hotfix");
const sqlFile = hotfix
  ? "migration_rive_asset_absolute_urls_hotfix.sql"
  : "migration_rive_asset_relative_urls.sql";

const sqlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase",
  "sql",
  sqlFile,
);
const migrationSql = readFileSync(sqlPath, "utf8");

const connectionString =
  process.env.DATABASE_URL?.trim() ||
  process.env.WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE?.trim();

if (!connectionString) {
  console.error("Thiếu DATABASE_URL trong .env.local");
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

console.log(hotfix ? "Chạy hotfix → https://cins.vn/..." : "Chạy → path tương đối");

const before = await sql`
  SELECT tp.slug, tp.tieu_de, tp.noi_dung_blocks::text as blocks
  FROM content_tac_pham tp
  WHERE tp.noi_dung_blocks::text LIKE '%/api/rive-asset/rive/%'
  ORDER BY tp.tao_luc DESC
  LIMIT 10
`;

for (const row of before) {
  console.log(" trước:", row.slug, row.blocks?.slice(0, 100));
}

await sql.unsafe(migrationSql);

const after = await sql`
  SELECT tp.slug, tp.tieu_de, tp.noi_dung_blocks::text as blocks
  FROM content_tac_pham tp
  WHERE tp.noi_dung_blocks::text LIKE '%/api/rive-asset/rive/%'
  ORDER BY tp.tao_luc DESC
  LIMIT 10
`;

for (const row of after) {
  console.log(" sau:", row.slug, row.blocks?.slice(0, 100));
}

await sql.end();
console.log("Xong.");

