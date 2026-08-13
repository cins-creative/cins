/**
 * Bước 0 PLAN_analytics_scale — dump schema log thô + hàm cron.
 * Usage: node scripts/introspect-analytics-scale.mjs
 * Ghi JSON vào stdout (không in connection string).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "../docs/_tmp_analytics_introspect.json");

const url =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL / SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

const db = postgres(url, {
  max: 1,
  connect_timeout: 20,
  ssl: "require",
  prepare: false,
});

try {
  const [partkey] = await db.unsafe(`
    SELECT c.relname, pg_get_partkeydef(c.oid) AS partkey, c.relkind
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'social_luot_xem'
  `);

  const partitions = await db.unsafe(`
    SELECT i.inhrelid::regclass::text AS partition,
           pg_get_expr(c.relpartbound, c.oid) AS bound,
           pg_size_pretty(pg_total_relation_size(i.inhrelid)) AS size,
           (SELECT reltuples::bigint FROM pg_class WHERE oid = i.inhrelid) AS uoc_row
    FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'public.social_luot_xem'::regclass
    ORDER BY 1
  `);

  const constraints = await db.unsafe(`
    SELECT conname, contype, pg_get_constraintdef(oid) AS def
    FROM pg_constraint WHERE conrelid = 'public.social_luot_xem'::regclass
    ORDER BY conname
  `);

  const indexes = await db.unsafe(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname='public' AND tablename LIKE 'social_luot_xem%'
    ORDER BY tablename, indexname
  `);

  const columns = await db.unsafe(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='social_luot_xem'
    ORDER BY ordinal_position
  `);

  const fns = await db.unsafe(`
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'social_ensure_partition_thang_sau','social_rollup_nguon','social_rollup_nhom',
      'shop_rollup_san_pham','social_xoa_danh_tinh_cu','social_rollup_su_kien',
      'social_ensure_partition'
    )
    ORDER BY p.proname
  `);

  const destCols = await db.unsafe(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN (
      'social_thong_ke_nguon_ngay','social_thong_ke_nhom_ngay',
      'shop_thong_ke_san_pham_ngay','social_thong_ke_doi_tuong_ngay'
    )
    ORDER BY table_name, ordinal_position
  `);

  const destTables = await db.unsafe(`
    SELECT c.relname, c.relkind,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
           c.reltuples::bigint AS uoc_row
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname IN (
      'social_thong_ke_nguon_ngay','social_thong_ke_nhom_ngay',
      'shop_thong_ke_san_pham_ngay','social_thong_ke_doi_tuong_ngay',
      'cins_cron_lease','cins_cron_log'
    )
  `);

  const sampleIds = await db.unsafe(`
    SELECT id_doi_tuong::text AS id, nguoi_xem::text AS viewer
    FROM public.social_luot_xem
    WHERE loai_su_kien = 'hien_thi'
    LIMIT 1
  `);

  let explainCoalesce = null;
  let explainViewer = null;
  if (sampleIds[0]?.id) {
    const id = sampleIds[0].id;
    const viewer = sampleIds[0].viewer;
    const [a] = await db.unsafe(`
      EXPLAIN (FORMAT JSON)
      SELECT count(*) FROM social_luot_xem
      WHERE coalesce(id_boi_canh, id_doi_tuong) = '${id}'::uuid
    `);
    explainCoalesce = a?.["QUERY PLAN"] ?? a;
    if (viewer) {
      const [b] = await db.unsafe(`
        EXPLAIN (FORMAT JSON)
        SELECT id_doi_tuong FROM social_luot_xem
        WHERE nguoi_xem = '${viewer}'::uuid AND loai_su_kien='hien_thi'
          AND id_doi_tuong IN ('${id}'::uuid) LIMIT 5000
      `);
      explainViewer = b?.["QUERY PLAN"] ?? b;
    }
  }

  const out = {
    partkey,
    partitions,
    constraints,
    indexes,
    columns,
    fns: fns.map((f) => ({
      proname: f.proname,
      args: f.args,
      def: f.def,
    })),
    destTables,
    destCols,
    sampleIds: sampleIds[0] ? { hasRow: true } : { hasRow: false },
    explainCoalesce,
    explainViewer,
  };

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("OK wrote", path.relative(process.cwd(), outPath));
  console.log(
    JSON.stringify(
      {
        partkey,
        partitions: partitions.map((p) => ({
          partition: p.partition,
          bound: p.bound,
          size: p.size,
          uoc_row: p.uoc_row,
        })),
        constraints: constraints.map((c) => ({
          conname: c.conname,
          contype: c.contype,
          def: c.def,
        })),
        indexCount: indexes.length,
        fnNames: fns.map((f) => `${f.proname}(${f.args})`),
        destTables,
        destTableNames: [...new Set(destCols.map((c) => c.table_name))],
        hasSample: Boolean(sampleIds[0]),
      },
      null,
      2,
    ),
  );
} catch (err) {
  console.error("Introspect failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
