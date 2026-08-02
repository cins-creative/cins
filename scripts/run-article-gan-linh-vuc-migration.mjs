/**
 * Chạy migration_article_gan_linh_vuc.sql
 * Usage: node scripts/run-article-gan-linh-vuc-migration.mjs
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
  "../supabase/sql/migration_article_gan_linh_vuc.sql",
);

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(url, { max: 1, prepare: false });

try {
  await db.unsafe(sqlText);

  const [stats] = await db`
    SELECT
      (SELECT count(*)::int FROM article_gan_linh_vuc) AS gan,
      (SELECT count(*)::int FROM article_gan_linh_vuc WHERE la_chinh) AS chinh,
      (SELECT count(*)::int FROM article_bai_viet
        WHERE loai_bai_viet = 'nghe' AND id_linh_vuc IS NOT NULL) AS nghe_co_lv
  `;

  console.log("OK: migration_article_gan_linh_vuc");
  console.log(JSON.stringify(stats, null, 2));
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
