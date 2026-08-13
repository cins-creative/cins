/**
 * P1 PLAN_analytics_scale — RPC khoảng tao_luc + rollup prunable +
 * index ON ONLY rồi CONCURRENTLY từng partition.
 * Usage: npm run migrate:analytics-p1
 *
 * Ưu tiên SUPABASE_DB_URL (direct) vì CREATE INDEX CONCURRENTLY không chạy
 * qua PgBouncer transaction mode.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url =
  process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing SUPABASE_DB_URL / DATABASE_URL in .env.local");
  process.exit(1);
}

const db = postgres(url, {
  max: 1,
  connect_timeout: 20,
  ssl: "require",
  prepare: false,
});

const INDEXES = [
  {
    parent: "social_luot_xem_viewer_idx",
    suffix: "viewer_idx",
    cols: "(nguoi_xem, id_doi_tuong, loai_su_kien)",
    pred: "WHERE nguoi_xem IS NOT NULL",
  },
  {
    parent: "social_luot_xem_id_doi_tuong_idx",
    suffix: "id_dt_idx",
    cols: "(id_doi_tuong, loai_su_kien, tao_luc)",
    pred: "",
  },
  {
    parent: "social_luot_xem_boi_canh_tao_luc_idx",
    suffix: "boi_canh_tl_idx",
    cols: "(id_boi_canh, loai_su_kien, tao_luc)",
    pred: "WHERE id_boi_canh IS NOT NULL",
  },
];

try {
  for (const name of [
    "migration_social_su_kien_index_range.sql",
    "migration_social_rollup_range.sql",
  ]) {
    const sqlPath = path.join(__dirname, "../supabase/sql", name);
    await db.unsafe(fs.readFileSync(sqlPath, "utf8"));
    console.log("OK:", name);
  }

  const parts = await db.unsafe(`
    SELECT c.relname AS ten
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'public.social_luot_xem'::regclass
    ORDER BY 1
  `);

  for (const spec of INDEXES) {
    for (const p of parts) {
      const child = `${p.ten}_${spec.suffix}`;
      const pred = spec.pred ? ` ${spec.pred}` : "";
      await db.unsafe(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${child}
         ON public.${p.ten} ${spec.cols}${pred}`,
      );
      try {
        await db.unsafe(
          `ALTER INDEX public.${spec.parent} ATTACH PARTITION public.${child}`,
        );
        console.log("attach", spec.parent, "←", child);
      } catch (err) {
        const msg = String(err?.message ?? err);
        if (/already/.test(msg) || /is already/.test(msg)) {
          console.log("skip attach", child);
        } else {
          throw err;
        }
      }
    }
  }

  const valid = await db.unsafe(`
    SELECT c.relname, i.indisvalid
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relname IN (
      'social_luot_xem_viewer_idx',
      'social_luot_xem_id_doi_tuong_idx',
      'social_luot_xem_boi_canh_tao_luc_idx'
    )
  `);
  console.log("parent indexes:", valid);
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
