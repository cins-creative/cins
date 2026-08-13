/**
 * P2 PLAN_analytics_scale — social_da_xem + rollup tháng + backfill 90 ngày.
 * Usage: npm run migrate:analytics-p2
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
  const sqlPath = path.join(
    __dirname,
    "../supabase/sql/migration_social_da_xem.sql",
  );
  await db.unsafe(fs.readFileSync(sqlPath, "utf8"));
  console.log("OK: migration_social_da_xem.sql");

  await db.unsafe(`SET statement_timeout = '300s'`);

  console.log("backfill daily rollup 90 ngay...");
  await db.unsafe(`
    DO $bf$
    DECLARE d date;
    BEGIN
      d := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 90;
      WHILE d <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date LOOP
        PERFORM public.social_rollup_su_kien(d);
        PERFORM public.social_rollup_nguon(d);
        PERFORM public.social_rollup_nhom(d);
        d := d + 1;
      END LOOP;
    END
    $bf$;
  `);
  const [ngayN] = await db.unsafe(
    `SELECT count(*)::bigint AS n FROM public.social_thong_ke_doi_tuong_ngay`,
  );
  console.log("daily rollup rows:", ngayN?.n);

  const [bf] = await db.unsafe(`
    SELECT public.social_backfill_da_xem(
      ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 90),
      (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    ) AS n
  `);
  console.log("backfill da_xem rows upserted:", bf?.n);

  const [th] = await db.unsafe(`
    SELECT public.social_rollup_thang(
      date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::timestamp)::date
    ) AS n
  `);
  console.log("rollup thang rows:", th?.n);

  const [chk] = await db.unsafe(`
    SELECT
      (SELECT count(*)::bigint FROM public.social_da_xem) AS da_xem,
      (SELECT count(*)::bigint FROM public.social_thong_ke_doi_tuong_thang) AS thang
  `);
  console.log("counts da_xem:", chk?.da_xem, "thang:", chk?.thang);

  const explain = await db.unsafe(`
    EXPLAIN
    SELECT count(*) FROM public.social_luot_xem
    WHERE tao_luc >= ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::timestamp
                      AT TIME ZONE 'Asia/Ho_Chi_Minh')
      AND tao_luc < now()
      AND id_doi_tuong = '00000000-0000-0000-0000-000000000001'
      AND loai_su_kien = 'hien_thi'
  `);
  console.log(
    "EXPLAIN today-delta:\n" +
      explain.map((r) => r["QUERY PLAN"]).join("\n"),
  );
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
