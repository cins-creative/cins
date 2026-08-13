/**
 * Kiểm thử P0–P3 analytics scale trên DB thật. Không ALTER / DROP / DELETE.
 * Usage: npm run verify:analytics
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

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

const fail = [];
const warn = [];
const ok = [];

function check(name, pass, detail) {
  if (pass) ok.push(`${name}${detail ? ` — ${detail}` : ""}`);
  else fail.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

function note(name, detail) {
  warn.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

function planText(rows) {
  return rows.map((r) => r["QUERY PLAN"]).join("\n");
}

try {
  const [partkey] = await db.unsafe(`
    SELECT pg_get_partkeydef(c.oid) AS partkey
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'social_luot_xem'
  `);
  check(
    "P0 partition RANGE(tao_luc)",
    String(partkey?.partkey || "").includes("tao_luc"),
    partkey?.partkey,
  );

  const parts = await db.unsafe(`
    SELECT c.relname,
           pg_get_expr(c.relpartbound, c.oid) AS bound
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'public.social_luot_xem'::regclass
    ORDER BY 1
  `);
  const names = parts.map((p) => p.relname);
  check(
    "P0 DEFAULT partition",
    names.includes("social_luot_xem_default"),
    names.join(", "),
  );
  check(
    "P0 tháng tương lai (10/11)",
    names.includes("social_luot_xem_2026_10") &&
      names.includes("social_luot_xem_2026_11"),
    names.filter((n) => n.includes("2026_1")).join(", ") || "thiếu",
  );

  const [lease] = await db.unsafe(`
    SELECT to_regclass('public.cins_cron_lease') IS NOT NULL AS lease,
           to_regclass('public.cins_cron_log') IS NOT NULL AS log
  `);
  check("P0 cins_cron_lease + log", Boolean(lease?.lease && lease?.log));

  const idx = await db.unsafe(`
    SELECT c.relname AS idx, i.indisvalid, i.indisready, n.nspname
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname IN (
      'social_luot_xem_viewer_idx',
      'social_luot_xem_id_doi_tuong_idx',
      'social_luot_xem_boi_canh_tao_luc_idx'
    )
  `);
  const parentIdx = idx.filter((r) =>
    [
      "social_luot_xem_viewer_idx",
      "social_luot_xem_id_doi_tuong_idx",
      "social_luot_xem_boi_canh_tao_luc_idx",
    ].includes(r.idx),
  );
  check(
    "P1 parent index valid (3)",
    parentIdx.length === 3 && parentIdx.every((r) => r.indisvalid),
    parentIdx.map((r) => `${r.idx}:${r.indisvalid}`).join(" "),
  );

  const childInvalid = await db.unsafe(`
    SELECT c.relname AS idx
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE i.indisvalid = false
      AND c.relname LIKE 'social_luot_xem%'
  `);
  check(
    "P1 không index child invalid",
    childInvalid.length === 0,
    childInvalid.map((r) => r.idx).join(", ") || "ok",
  );

  const fns = await db.unsafe(`
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'social_ensure_partition',
      'cins_cron_giu_lease',
      'social_rollup_su_kien',
      'social_rollup_nguon',
      'social_rollup_nhom',
      'social_rollup_da_xem',
      'social_rollup_thang',
      'social_rollup_dem_doi_tuong',
      'social_xoa_danh_tinh_cu',
      'social_insight_doi_tuong'
    )
    ORDER BY 1, 2
  `);
  const fnNames = new Set(fns.map((f) => f.proname));
  for (const need of [
    "social_ensure_partition",
    "social_rollup_da_xem",
    "social_rollup_thang",
    "social_rollup_dem_doi_tuong",
    "social_xoa_danh_tinh_cu",
  ]) {
    check(`hàm ${need}`, fnNames.has(need));
  }
  const insight4 = fns.some(
    (f) =>
      f.proname === "social_insight_doi_tuong" &&
      String(f.args).includes("timestamp"),
  );
  check("P1 social_insight_doi_tuong 4-arg", insight4);

  const tables = await db.unsafe(`
    SELECT c.relname, c.relrowsecurity AS rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname IN (
        'social_da_xem',
        'social_dem_doi_tuong',
        'social_thong_ke_doi_tuong_thang',
        'social_thong_ke_doi_tuong_ngay',
        'cins_cron_lease'
      )
  `);
  for (const t of [
    "social_da_xem",
    "social_dem_doi_tuong",
    "social_thong_ke_doi_tuong_thang",
  ]) {
    const row = tables.find((x) => x.relname === t);
    check(`bảng ${t} + RLS`, Boolean(row?.rls), row ? `rls=${row.rls}` : "THIẾU");
  }

  const policies = await db.unsafe(`
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN (
      'social_da_xem', 'social_dem_doi_tuong', 'social_thong_ke_doi_tuong_thang'
    )
  `);
  check(
    "không policy public trên bảng mới",
    policies.length === 0,
    policies.map((p) => `${p.tablename}:${p.policyname}`).join(", ") || "ok",
  );

  const grants = await db.unsafe(`
    SELECT table_name, grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name IN ('social_da_xem', 'social_dem_doi_tuong')
      AND grantee IN ('anon', 'authenticated', 'public')
  `);
  check(
    "anon/authenticated không GRANT bảng mới",
    grants.length === 0,
    grants.map((g) => `${g.grantee}:${g.table_name}:${g.privilege_type}`).join(" ") ||
      "ok",
  );

  const [counts] = await db.unsafe(`
    SELECT
      (SELECT count(*) FROM social_da_xem) AS da_xem,
      (SELECT count(*) FROM social_da_xem WHERE nguoi_xem IS NOT NULL) AS da_xem_user,
      (SELECT count(*) FROM social_dem_doi_tuong) AS dem,
      (SELECT count(*) FROM social_thong_ke_doi_tuong_ngay) AS ngay,
      (SELECT count(*) FROM social_thong_ke_doi_tuong_thang) AS thang,
      (SELECT coalesce(sum(nguoi_tiep_can),0) FROM social_dem_doi_tuong) AS dem_nguoi,
      (SELECT coalesce(sum(luot_tiep_can),0) FROM social_dem_doi_tuong) AS dem_luot
  `);
  check("P2 social_da_xem có data", Number(counts.da_xem) > 0, String(counts.da_xem));
  check(
    "P2 rollup ngày có data",
    Number(counts.ngay) > 0,
    String(counts.ngay),
  );
  check("P2 rollup tháng có data", Number(counts.thang) > 0, String(counts.thang));
  check("P3 social_dem_doi_tuong có data", Number(counts.dem) > 0, String(counts.dem));

  const [before] = await db.unsafe(`
    SELECT count(*)::bigint AS n, coalesce(sum(so_lan),0)::bigint AS so_lan
    FROM social_da_xem
  `);
  await db.unsafe(`
    SELECT public.social_rollup_da_xem(
      (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    )
  `);
  const [mid] = await db.unsafe(`
    SELECT count(*)::bigint AS n, coalesce(sum(so_lan),0)::bigint AS so_lan
    FROM social_da_xem
  `);
  await db.unsafe(`
    SELECT public.social_rollup_da_xem(
      (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    )
  `);
  const [after] = await db.unsafe(`
    SELECT count(*)::bigint AS n, coalesce(sum(so_lan),0)::bigint AS so_lan
    FROM social_da_xem
  `);
  check(
    "P2 rollup hôm nay 2 lần liên tiếp: unique ổn",
    String(mid.n) === String(after.n),
    `${before.n} → ${mid.n} → ${after.n}`,
  );
  check(
    "P2 rollup hôm nay 2 lần liên tiếp: so_lan ổn",
    String(mid.so_lan) === String(after.so_lan),
    `${before.so_lan} → ${mid.so_lan} → ${after.so_lan}`,
  );

  await db.unsafe(`SELECT public.social_rollup_dem_doi_tuong()`);
  const [sync] = await db.unsafe(`
    SELECT
      (SELECT count(*) FROM social_da_xem) AS da_xem,
      (SELECT coalesce(sum(nguoi_tiep_can),0) FROM social_dem_doi_tuong) AS dem_nguoi
  `);
  check(
    "P3 sau rebuild: nguoi_tiep_can = count da_xem",
    Number(sync.dem_nguoi) === Number(sync.da_xem),
    `dem=${sync.dem_nguoi} da_xem=${sync.da_xem}`,
  );

  const sample = await db.unsafe(`
    SELECT id_doi_tuong::text AS id, loai_doi_tuong::text AS loai,
           count(*)::int AS unique_n
    FROM social_da_xem
    GROUP BY 1, 2
    HAVING count(*) >= 5
    ORDER BY count(*) DESC
    LIMIT 1
  `);
  if (sample.length === 0) {
    note("insight sample unique>=5", "không có bài nào ≥5 — k-anon sẽ hiện 0");
  } else {
    const s = sample[0];
    const [cmp] = await db.unsafe(`
      SELECT
        (SELECT count(*) FROM social_da_xem
          WHERE id_doi_tuong = $1::uuid AND loai_doi_tuong = $2::loai_doi_tuong_social_enum
        ) AS da_xem_n,
        (SELECT coalesce(sum(luot_tiep_can),0) FROM social_thong_ke_doi_tuong_ngay
          WHERE id_doi_tuong = $1::uuid AND loai_doi_tuong = $2::loai_doi_tuong_social_enum
            AND ngay < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        ) AS luot_truoc_hom_nay,
        (SELECT nguoi_tiep_can FROM social_dem_doi_tuong WHERE id_doi_tuong = $1::uuid) AS dem_nguoi
    `, [s.id, s.loai]);
    check(
      "P2 unique bài mẫu = dem.nguoi",
      Number(cmp.da_xem_n) === Number(cmp.dem_nguoi),
      `${s.loai} unique=${cmp.da_xem_n} dem=${cmp.dem_nguoi} luot_hist=${cmp.luot_truoc_hom_nay}`,
    );

    const explToday = await db.unsafe(`
      EXPLAIN
      SELECT count(*) FROM social_luot_xem
      WHERE tao_luc >= ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::timestamp
                        AT TIME ZONE 'Asia/Ho_Chi_Minh')
        AND tao_luc < now()
        AND id_doi_tuong = $1::uuid
        AND loai_su_kien = 'hien_thi'
    `, [s.id]);
    const pToday = planText(explToday);
    check(
      "EXPLAIN today-delta Index + prune",
      /Index (Only )?Scan/i.test(pToday) && /Subplans Removed/i.test(pToday),
      pToday.split("\n")[0],
    );
    if (/Seq Scan/i.test(pToday) && !/Index/i.test(pToday)) {
      fail.push("EXPLAIN today-delta Seq Scan");
    }

    const explViewer = await db.unsafe(`
      EXPLAIN
      SELECT id_doi_tuong, so_lan FROM social_da_xem
      WHERE viewer_key = '00000000-0000-0000-0000-000000000001'
        AND id_doi_tuong = $1::uuid
    `, [s.id]);
    const pViewer = planText(explViewer);
    check(
      "EXPLAIN da_xem viewer PK",
      /Index/i.test(pViewer) && !/Seq Scan/i.test(pViewer),
      pViewer.split("\n")[0],
    );

    const explDem = await db.unsafe(`
      EXPLAIN
      SELECT luot_tiep_can FROM social_dem_doi_tuong
      WHERE id_doi_tuong = $1::uuid
    `, [s.id]);
    const pDem = planText(explDem);
    check(
      "EXPLAIN dem_doi_tuong PK",
      /Index/i.test(pDem) && !/Seq Scan/i.test(pDem),
      pDem.split("\n")[0],
    );
  }

  const explCoalesce = await db.unsafe(`
    EXPLAIN
    SELECT count(*) FROM social_luot_xem
    WHERE coalesce(id_boi_canh, id_doi_tuong) = '00000000-0000-0000-0000-000000000001'::uuid
  `);
  const pCo = planText(explCoalesce);
  if (!/Seq Scan/i.test(pCo)) {
    note("coalesce cũ không còn Seq Scan (bất ngờ, không hại)", pCo.split("\n")[0]);
  } else {
    ok.push("coalesce cũ vẫn Seq Scan — app không gọi (đúng P1)");
  }

  const execAnon = await db.unsafe(`
    SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'social_rollup_da_xem', 'social_insight_doi_tuong', 'social_xoa_danh_tinh_cu'
    )
  `);
  const leak = execAnon.filter((r) => r.anon_exec || r.auth_exec);
  check(
    "anon/authenticated không EXECUTE rollup/insight",
    leak.length === 0,
    leak.map((r) => `${r.proname} anon=${r.anon_exec} auth=${r.auth_exec}`).join(" ") ||
      "ok",
  );

  console.log("\n=== OK (%d) ===", ok.length);
  for (const l of ok) console.log("  ✓", l);
  if (warn.length) {
    console.log("\n=== CẢNH BÁO (%d) ===", warn.length);
    for (const l of warn) console.log("  !", l);
  }
  if (fail.length) {
    console.log("\n=== LỖI (%d) ===", fail.length);
    for (const l of fail) console.log("  ✗", l);
    process.exit(1);
  }
  console.log("\nTất cả check DB đã qua.");
} catch (err) {
  console.error("Verify failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
