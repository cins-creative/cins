/**
 * Chạy migration_org_su_kien_slug.sql + backfill slugify(ten).
 * Usage: node --env-file=.env.local scripts/run-org-su-kien-slug-migration.mjs
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
  "../supabase/sql/migration_org_su_kien_slug.sql",
);

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

function slugifyTen(value) {
  const cleaned = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return cleaned || "su-kien";
}

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(url, { max: 1 });

try {
  await db.unsafe(sqlText);
  console.log("OK: column slug + unique index");

  const rows = await db`
    select id, ten, slug from public.org_su_kien order by id
  `;

  const used = new Set();
  for (const row of rows) {
    const base = slugifyTen(row.ten);
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${n}`.slice(0, 80);
      n += 1;
      if (n > 200) {
        candidate = `sk-${String(row.id).replace(/-/g, "").slice(0, 16)}`;
        break;
      }
    }
    used.add(candidate);
    if (candidate !== row.slug) {
      await db`update public.org_su_kien set slug = ${candidate} where id = ${row.id}`;
      console.log(`slug: ${row.ten} → ${candidate}`);
    }
  }

  console.log(`OK: backfilled ${rows.length} sự kiện`);
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
