import "server-only";

import { withTagPostgres } from "@/lib/tag/postgres";
import type {
  AdminTagListParams,
  AdminTagListResponse,
  AdminTagListRow,
} from "@/lib/tag/admin-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const TAG_LOAI = ["keyword", "phan_mem"] as const;

function clampPage(page: number): number {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit < 1) return 50;
  return Math.min(100, Math.floor(limit));
}

async function fetchAdminTagListViaPostgres(
  params: AdminTagListParams,
): Promise<AdminTagListResponse | null> {
  const page = clampPage(params.page);
  const limit = clampLimit(params.limit);
  const offset = (page - 1) * limit;

  const loaiFrag =
    params.loai === "keyword"
      ? "AND bv.loai_bai_viet = 'keyword'"
      : params.loai === "phan_mem"
        ? "AND bv.loai_bai_viet = 'phan_mem'"
        : "";

  const verifyFrag =
    params.trang_thai === "chua_verify"
      ? "AND bv.da_verify IS NOT TRUE"
      : params.trang_thai === "da_verify"
        ? "AND bv.da_verify = TRUE"
        : "";

  const q = params.q.trim();
  const searchPattern = q ? `%${q}%` : null;

  const orderFrag =
    params.sort === "moi_nhat"
      ? "bv.tao_luc DESC"
      : params.sort === "a_z"
        ? "bv.tieu_de ASC"
        : "(COALESCE(uc.so_nguoi, 0) + COALESCE(wc.so_tac_pham, 0)) DESC, bv.tao_luc DESC";

  return withTagPostgres(async (sql) => {
    const countRows = searchPattern
      ? await sql<{ total: string }[]>`
          SELECT COUNT(*)::text AS total
          FROM article_bai_viet bv
          WHERE bv.loai_bai_viet IN ('keyword', 'phan_mem')
            AND bv.trang_thai_noi_dung <> 'merged'
            ${sql.unsafe(loaiFrag)}
            ${sql.unsafe(verifyFrag)}
            AND (
              bv.tieu_de ILIKE ${searchPattern}
              OR bv.tieu_de_viet ILIKE ${searchPattern}
            )
        `
      : await sql<{ total: string }[]>`
          SELECT COUNT(*)::text AS total
          FROM article_bai_viet bv
          WHERE bv.loai_bai_viet IN ('keyword', 'phan_mem')
            AND bv.trang_thai_noi_dung <> 'merged'
            ${sql.unsafe(loaiFrag)}
            ${sql.unsafe(verifyFrag)}
        `;
    const total = Number(countRows[0]?.total ?? 0);

    const rows = searchPattern
      ? await sql<
      {
        id: string;
        tieu_de: string;
        slug: string;
        loai_bai_viet: string;
        da_verify: boolean | null;
        tom_tat: string | null;
        tao_luc: string;
        so_nguoi_tagged: number;
        so_tac_pham_tagged: number;
      }[]
    >`
      WITH user_union AS (
        SELECT agc.id_bai_viet, cm.id_nguoi_dung AS user_id
        FROM article_gan_cot_moc agc
        INNER JOIN content_cot_moc cm ON cm.id = agc.id_cot_moc
        WHERE cm.che_do_hien_thi IN ('public', 'feature')
        UNION
        SELECT agt.id_bai_viet, tg.id_nguoi_dung
        FROM article_gan_tac_pham agt
        INNER JOIN content_tac_pham tp ON tp.id = agt.id_tac_pham
        INNER JOIN content_tac_pham_tac_gia tg
          ON tg.id_tac_pham = tp.id AND tg.trang_thai = 'accepted'
      ),
      user_counts AS (
        SELECT id_bai_viet, COUNT(DISTINCT user_id)::int AS so_nguoi
        FROM user_union
        GROUP BY id_bai_viet
      ),
      work_counts AS (
        SELECT agt.id_bai_viet, COUNT(DISTINCT agt.id_tac_pham)::int AS so_tac_pham
        FROM article_gan_tac_pham agt
        GROUP BY agt.id_bai_viet
      )
      SELECT
        bv.id,
        bv.tieu_de,
        bv.slug,
        bv.loai_bai_viet,
        bv.da_verify,
        bv.tom_tat,
        bv.tao_luc,
        COALESCE(uc.so_nguoi, 0) AS so_nguoi_tagged,
        COALESCE(wc.so_tac_pham, 0) AS so_tac_pham_tagged
      FROM article_bai_viet bv
      LEFT JOIN user_counts uc ON uc.id_bai_viet = bv.id
      LEFT JOIN work_counts wc ON wc.id_bai_viet = bv.id
      WHERE bv.loai_bai_viet IN ('keyword', 'phan_mem')
        AND bv.trang_thai_noi_dung <> 'merged'
        ${sql.unsafe(loaiFrag)}
        ${sql.unsafe(verifyFrag)}
        AND (
          bv.tieu_de ILIKE ${searchPattern}
          OR bv.tieu_de_viet ILIKE ${searchPattern}
        )
      ORDER BY ${sql.unsafe(orderFrag)}
      LIMIT ${limit}
      OFFSET ${offset}
    `
      : await sql<
      {
        id: string;
        tieu_de: string;
        slug: string;
        loai_bai_viet: string;
        da_verify: boolean | null;
        tom_tat: string | null;
        tao_luc: string;
        so_nguoi_tagged: number;
        so_tac_pham_tagged: number;
      }[]
    >`
      WITH user_union AS (
        SELECT agc.id_bai_viet, cm.id_nguoi_dung AS user_id
        FROM article_gan_cot_moc agc
        INNER JOIN content_cot_moc cm ON cm.id = agc.id_cot_moc
        WHERE cm.che_do_hien_thi IN ('public', 'feature')
        UNION
        SELECT agt.id_bai_viet, tg.id_nguoi_dung
        FROM article_gan_tac_pham agt
        INNER JOIN content_tac_pham tp ON tp.id = agt.id_tac_pham
        INNER JOIN content_tac_pham_tac_gia tg
          ON tg.id_tac_pham = tp.id AND tg.trang_thai = 'accepted'
      ),
      user_counts AS (
        SELECT id_bai_viet, COUNT(DISTINCT user_id)::int AS so_nguoi
        FROM user_union
        GROUP BY id_bai_viet
      ),
      work_counts AS (
        SELECT agt.id_bai_viet, COUNT(DISTINCT agt.id_tac_pham)::int AS so_tac_pham
        FROM article_gan_tac_pham agt
        GROUP BY agt.id_bai_viet
      )
      SELECT
        bv.id,
        bv.tieu_de,
        bv.slug,
        bv.loai_bai_viet,
        bv.da_verify,
        bv.tom_tat,
        bv.tao_luc,
        COALESCE(uc.so_nguoi, 0) AS so_nguoi_tagged,
        COALESCE(wc.so_tac_pham, 0) AS so_tac_pham_tagged
      FROM article_bai_viet bv
      LEFT JOIN user_counts uc ON uc.id_bai_viet = bv.id
      LEFT JOIN work_counts wc ON wc.id_bai_viet = bv.id
      WHERE bv.loai_bai_viet IN ('keyword', 'phan_mem')
        AND bv.trang_thai_noi_dung <> 'merged'
        ${sql.unsafe(loaiFrag)}
        ${sql.unsafe(verifyFrag)}
      ORDER BY ${sql.unsafe(orderFrag)}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return {
      rows: rows.map(mapRow),
      total,
      page,
      limit,
    };
  });
}

function mapRow(r: {
  id: string;
  tieu_de: string;
  slug: string;
  loai_bai_viet: string;
  da_verify: boolean | null;
  tom_tat: string | null;
  tao_luc: string;
  so_nguoi_tagged: number;
  so_tac_pham_tagged: number;
}): AdminTagListRow {
  return {
    id: r.id,
    tieu_de: r.tieu_de,
    slug: r.slug,
    loai_bai_viet:
      r.loai_bai_viet === "phan_mem" ? "phan_mem" : "keyword",
    da_verify: r.da_verify === true,
    tom_tat: r.tom_tat,
    so_nguoi_tagged: Number(r.so_nguoi_tagged) || 0,
    so_tac_pham_tagged: Number(r.so_tac_pham_tagged) || 0,
    tao_luc: r.tao_luc,
  };
}

async function attachCounts(
  rows: AdminTagListRow[],
): Promise<AdminTagListRow[]> {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id);
  const admin = createServiceRoleClient();

  const [{ data: mocLinks }, { data: tpLinks }, { data: tpOnly }] =
    await Promise.all([
      admin
        .from("article_gan_cot_moc")
        .select(
          "id_bai_viet, content_cot_moc:content_cot_moc!inner(id_nguoi_dung, che_do_hien_thi)",
        )
        .in("id_bai_viet", ids),
      admin
        .from("article_gan_tac_pham")
        .select(
          "id_bai_viet, content_tac_pham:content_tac_pham!inner(content_tac_pham_tac_gia ( id_nguoi_dung, trang_thai ))",
        )
        .in("id_bai_viet", ids),
      admin
        .from("article_gan_tac_pham")
        .select("id_bai_viet, id_tac_pham")
        .in("id_bai_viet", ids),
    ]);

  const usersByTag = new Map<string, Set<string>>();
  const worksByTag = new Map<string, Set<string>>();

  for (const id of ids) {
    usersByTag.set(id, new Set());
    worksByTag.set(id, new Set());
  }

  for (const row of mocLinks ?? []) {
    const tagId = String((row as { id_bai_viet?: string }).id_bai_viet ?? "");
    const moc = (row as { content_cot_moc?: { id_nguoi_dung?: string; che_do_hien_thi?: string } })
      .content_cot_moc;
    if (!tagId || !moc?.id_nguoi_dung) continue;
    if (!["public", "feature"].includes(String(moc.che_do_hien_thi ?? ""))) {
      continue;
    }
    usersByTag.get(tagId)?.add(String(moc.id_nguoi_dung));
  }

  for (const row of tpLinks ?? []) {
    const tagId = String((row as { id_bai_viet?: string }).id_bai_viet ?? "");
    const tp = (row as {
      content_tac_pham?: {
        content_tac_pham_tac_gia?: Array<{
          id_nguoi_dung?: string;
          trang_thai?: string;
        }>;
      } | null;
    }).content_tac_pham;
    const authors = tp?.content_tac_pham_tac_gia;
    if (!tagId) continue;
    for (const tg of authors ?? []) {
      if (tg.trang_thai !== "accepted" || !tg.id_nguoi_dung) continue;
      usersByTag.get(tagId)?.add(String(tg.id_nguoi_dung));
    }
  }

  for (const row of tpOnly ?? []) {
    const tagId = String((row as { id_bai_viet?: string }).id_bai_viet ?? "");
    const tpId = String((row as { id_tac_pham?: string }).id_tac_pham ?? "");
    if (!tagId || !tpId) continue;
    worksByTag.get(tagId)?.add(tpId);
  }

  return rows.map((r) => ({
    ...r,
    so_nguoi_tagged: usersByTag.get(r.id)?.size ?? 0,
    so_tac_pham_tagged: worksByTag.get(r.id)?.size ?? 0,
  }));
}

async function fetchAdminTagListViaSupabase(
  params: AdminTagListParams,
): Promise<AdminTagListResponse> {
  const page = clampPage(params.page);
  const limit = clampLimit(params.limit);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const admin = createServiceRoleClient();
  let req = admin
    .from("article_bai_viet")
    .select(
      "id, tieu_de, slug, loai_bai_viet, da_verify, tom_tat, tao_luc",
      { count: "exact" },
    )
    .in("loai_bai_viet", [...TAG_LOAI])
    .neq("trang_thai_noi_dung", "merged");

  if (params.loai === "keyword" || params.loai === "phan_mem") {
    req = req.eq("loai_bai_viet", params.loai);
  }
  if (params.trang_thai === "chua_verify") {
    req = req.or("da_verify.is.null,da_verify.eq.false");
  } else if (params.trang_thai === "da_verify") {
    req = req.eq("da_verify", true);
  }
  const q = params.q.trim();
  if (q) {
    const safe = `%${q.replace(/[%_]/g, "\\$&")}%`;
    req = req.or(`tieu_de.ilike.${safe},tieu_de_viet.ilike.${safe}`);
  }

  if (params.sort === "moi_nhat") {
    req = req.order("tao_luc", { ascending: false });
  } else if (params.sort === "a_z") {
    req = req.order("tieu_de", { ascending: true });
  } else {
    req = req.order("tao_luc", { ascending: false });
  }

  const { data, count, error } = await req.range(from, to);
  if (error) {
    console.error("[admin/tag/list] supabase:", error.message);
    return { rows: [], total: 0, page, limit };
  }

  let rows = (data ?? []).map((r) =>
    mapRow({
      ...r,
      loai_bai_viet: String(r.loai_bai_viet),
      so_nguoi_tagged: 0,
      so_tac_pham_tagged: 0,
    } as Parameters<typeof mapRow>[0]),
  );

  rows = await attachCounts(rows);

  if (params.sort === "pho_bien") {
    rows.sort(
      (a, b) =>
        b.so_nguoi_tagged +
        b.so_tac_pham_tagged -
        (a.so_nguoi_tagged + a.so_tac_pham_tagged),
    );
  }

  return {
    rows,
    total: count ?? rows.length,
    page,
    limit,
  };
}

export function parseAdminTagListSearchParams(
  sp: URLSearchParams,
): AdminTagListParams {
  const loaiRaw = sp.get("loai")?.trim() ?? "all";
  const loai =
    loaiRaw === "keyword" || loaiRaw === "phan_mem" ? loaiRaw : "all";

  const trangThaiRaw = sp.get("trang_thai")?.trim() ?? "chua_verify";
  const trang_thai =
    trangThaiRaw === "da_verify" || trangThaiRaw === "all"
      ? trangThaiRaw
      : "chua_verify";

  const sortRaw = sp.get("sort")?.trim() ?? "pho_bien";
  const sort =
    sortRaw === "moi_nhat" || sortRaw === "a_z" ? sortRaw : "pho_bien";

  const page = Number(sp.get("page") ?? "1");
  const limit = Number(sp.get("limit") ?? "50");

  return {
    loai,
    trang_thai,
    sort,
    q: sp.get("q")?.trim() ?? "",
    page,
    limit,
  };
}

export async function fetchAdminTagList(
  params: AdminTagListParams,
): Promise<AdminTagListResponse> {
  const viaPg = await fetchAdminTagListViaPostgres(params);
  if (viaPg) return viaPg;
  return fetchAdminTagListViaSupabase(params);
}
