import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  TAG_SUGGEST_INDEX_MAX,
  type TagSuggestRow,
} from "@/lib/tag/suggest-types";
import { withTagPostgres } from "@/lib/tag/postgres";
import {
  PICKABLE_TAG_LOAI,
  parsePickableTagLoai,
} from "@/lib/tag/tag-loai";

type IndexRow = {
  id: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  da_verify: boolean | null;
  loai_bai_viet: string;
  linh_vuc_ten: string | null;
  so_nguoi_tagged: number;
  so_gan: number;
  cover_id: string | null;
  slug: string | null;
};

function mapIndexRow(r: IndexRow): TagSuggestRow {
  return {
    id: r.id,
    tieu_de: String(r.tieu_de ?? "").trim() || "Không tiêu đề",
    tieu_de_viet:
      r.tieu_de_viet == null
        ? null
        : String(r.tieu_de_viet).trim() || null,
    tieu_de_eng:
      r.tieu_de_eng == null ? null : String(r.tieu_de_eng).trim() || null,
    da_verify: r.da_verify === true,
    loai_bai_viet: parsePickableTagLoai(r.loai_bai_viet),
    linh_vuc_ten: r.linh_vuc_ten?.trim() || null,
    so_nguoi_tagged: Number(r.so_nguoi_tagged) || 0,
    so_gan: Number(r.so_gan) || 0,
    cover_id:
      r.cover_id == null ? null : String(r.cover_id).trim() || null,
    slug: r.slug == null ? null : String(r.slug).trim() || null,
  };
}

/**
 * Index nhẹ (không CTE đếm usage) — Workers/Hyperdrive dễ timeout nếu join
 * article_gan_* + shop_nhom_fandom trên toàn bộ tag.
 * `so_gan` / `so_nguoi_tagged` gắn sau bằng attachGanCountsViaPostgres (best-effort).
 */
async function loadTagSuggestIndexViaPostgres(): Promise<TagSuggestRow[] | null> {
  return withTagPostgres(async (sql) => {
    const rows = await sql<IndexRow[]>`
      SELECT
        bv.id,
        bv.tieu_de,
        bv.tieu_de_viet,
        bv.tieu_de_eng,
        bv.da_verify,
        bv.loai_bai_viet,
        bv.cover_id,
        bv.slug,
        lv.ten AS linh_vuc_ten,
        0::int AS so_nguoi_tagged,
        0::int AS so_gan
      FROM article_bai_viet bv
      LEFT JOIN linh_vuc lv ON lv.id = bv.id_linh_vuc
      WHERE bv.loai_bai_viet IN ('keyword', 'phan_mem', 'mon_hoc', 'nganh_dao_tao', 'nghe', 'fandom')
        AND bv.trang_thai_noi_dung = 'published'
      ORDER BY bv.cap_nhat_luc DESC
      LIMIT ${TAG_SUGGEST_INDEX_MAX}
    `;
    return rows.map(mapIndexRow);
  });
}

/**
 * Đếm số bài đăng (cột mốc) public trên trang entity — khớp
 * `fetchEntityMilestones` / trang fandom.
 * Nguồn: `article_gan_cot_moc` ∪ fallback qua `article_gan_tac_pham`.
 */
async function attachGanCountsViaPostgres(
  rows: TagSuggestRow[],
): Promise<TagSuggestRow[]> {
  if (rows.length === 0) return rows;
  const withCounts = await withTagPostgres(async (sql) => {
    const ids = rows.map((r) => r.id);
    const counts = await sql<
      { id_bai_viet: string; so_gan: number; so_nguoi_tagged: number }[]
    >`
      SELECT
        id_bai_viet,
        COUNT(DISTINCT id_cot_moc)::int AS so_gan,
        COUNT(DISTINCT id_nguoi_dung)::int AS so_nguoi_tagged
      FROM (
        SELECT agc.id_bai_viet, cm.id AS id_cot_moc, cm.id_nguoi_dung
        FROM article_gan_cot_moc agc
        INNER JOIN content_cot_moc cm ON cm.id = agc.id_cot_moc
        WHERE agc.id_bai_viet = ANY(${ids})
          AND cm.che_do_hien_thi IN ('public', 'feature', 'cong_dong')
        UNION
        SELECT agt.id_bai_viet, cm.id AS id_cot_moc, tg.id_nguoi_dung
        FROM article_gan_tac_pham agt
        INNER JOIN content_tac_pham_thuoc_moc tm
          ON tm.id_tac_pham = agt.id_tac_pham
        INNER JOIN content_cot_moc cm ON cm.id = tm.id_cot_moc
        LEFT JOIN content_tac_pham_tac_gia tg
          ON tg.id_tac_pham = agt.id_tac_pham AND tg.trang_thai = 'accepted'
        WHERE agt.id_bai_viet = ANY(${ids})
          AND cm.che_do_hien_thi IN ('public', 'feature', 'cong_dong')
      ) t
      GROUP BY id_bai_viet
    `;
    const gan = new Map(
      counts.map((r) => [String(r.id_bai_viet), Number(r.so_gan) || 0]),
    );
    const nguoi = new Map(
      counts.map((r) => [
        String(r.id_bai_viet),
        Number(r.so_nguoi_tagged) || 0,
      ]),
    );
    return rows.map((r) => ({
      ...r,
      so_gan: gan.get(r.id) ?? 0,
      so_nguoi_tagged: nguoi.get(r.id) ?? 0,
    }));
  });
  return withCounts ?? rows;
}

async function attachUsageCounts(
  rows: TagSuggestRow[],
): Promise<TagSuggestRow[]> {
  if (rows.length === 0) return rows;
  try {
    const ids = rows.map((r) => r.id);
    const admin = createServiceRoleClient();
    const visible = new Set(["public", "feature", "cong_dong"]);

    const [{ data: mocLinks }, { data: tpLinks }] = await Promise.all([
      admin
        .from("article_gan_cot_moc")
        .select(
          "id_bai_viet, content_cot_moc:content_cot_moc!inner(id, id_nguoi_dung, che_do_hien_thi)",
        )
        .in("id_bai_viet", ids),
      admin
        .from("article_gan_tac_pham")
        .select(
          "id_bai_viet, content_tac_pham:content_tac_pham!inner(content_tac_pham_thuoc_moc ( content_cot_moc:content_cot_moc!inner ( id, che_do_hien_thi ) ), content_tac_pham_tac_gia ( id_nguoi_dung, trang_thai ))",
        )
        .in("id_bai_viet", ids),
    ]);

    const usersByTag = new Map<string, Set<string>>();
    const postsByTag = new Map<string, Set<string>>();
    for (const id of ids) {
      usersByTag.set(id, new Set());
      postsByTag.set(id, new Set());
    }

    for (const row of mocLinks ?? []) {
      const tagId = String((row as { id_bai_viet?: string }).id_bai_viet ?? "");
      const moc = (
        row as {
          content_cot_moc?: {
            id?: string;
            id_nguoi_dung?: string;
            che_do_hien_thi?: string;
          };
        }
      ).content_cot_moc;
      if (!tagId || !moc?.id) continue;
      if (!visible.has(String(moc.che_do_hien_thi ?? ""))) continue;
      postsByTag.get(tagId)?.add(String(moc.id));
      if (moc.id_nguoi_dung) {
        usersByTag.get(tagId)?.add(String(moc.id_nguoi_dung));
      }
    }

    for (const row of tpLinks ?? []) {
      const tagId = String((row as { id_bai_viet?: string }).id_bai_viet ?? "");
      if (!tagId) continue;
      const tp = (
        row as {
          content_tac_pham?: {
            content_tac_pham_thuoc_moc?: Array<{
              content_cot_moc?: {
                id?: string;
                che_do_hien_thi?: string;
              } | null;
            }>;
            content_tac_pham_tac_gia?: Array<{
              id_nguoi_dung?: string;
              trang_thai?: string;
            }>;
          } | null;
        }
      ).content_tac_pham;
      for (const thuoc of tp?.content_tac_pham_thuoc_moc ?? []) {
        const moc = thuoc.content_cot_moc;
        if (!moc?.id) continue;
        if (!visible.has(String(moc.che_do_hien_thi ?? ""))) continue;
        postsByTag.get(tagId)?.add(String(moc.id));
      }
      for (const tg of tp?.content_tac_pham_tac_gia ?? []) {
        if (tg.trang_thai !== "accepted" || !tg.id_nguoi_dung) continue;
        usersByTag.get(tagId)?.add(String(tg.id_nguoi_dung));
      }
    }

    return rows.map((r) => ({
      ...r,
      so_nguoi_tagged: usersByTag.get(r.id)?.size ?? 0,
      so_gan: postsByTag.get(r.id)?.size ?? 0,
    }));
  } catch {
    /* Prod Workers: đếm usage fail vẫn trả index để gợi ý hiện. */
    return rows;
  }
}

async function loadTagSuggestIndexViaSupabase(): Promise<TagSuggestRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_bai_viet")
    .select(
      "id, tieu_de, tieu_de_viet, tieu_de_eng, da_verify, loai_bai_viet, cover_id, slug, linh_vuc:id_linh_vuc(ten)",
    )
    .in("loai_bai_viet", [...PICKABLE_TAG_LOAI])
    .eq("trang_thai_noi_dung", "published")
    .order("cap_nhat_luc", { ascending: false })
    .limit(TAG_SUGGEST_INDEX_MAX);

  if (error || !data) return [];

  const base = data.map((row) => {
    const lvRaw = row.linh_vuc as { ten?: string | null } | { ten?: string | null }[] | null;
    const lvNode = Array.isArray(lvRaw) ? lvRaw[0] : lvRaw;
    return mapIndexRow({
      id: String(row.id),
      tieu_de: String(row.tieu_de ?? ""),
      tieu_de_viet: (row.tieu_de_viet as string | null) ?? null,
      tieu_de_eng: (row.tieu_de_eng as string | null) ?? null,
      da_verify: row.da_verify as boolean | null,
      loai_bai_viet: String(row.loai_bai_viet ?? "keyword"),
      linh_vuc_ten: lvNode?.ten?.trim() || null,
      so_nguoi_tagged: 0,
      so_gan: 0,
      cover_id: (row.cover_id as string | null) ?? null,
      slug: (row.slug as string | null) ?? null,
    });
  });

  return attachUsageCounts(base);
}

/** Bulk index tag pickable — dùng cho filter client-side tức thì. */
export async function loadTagSuggestIndex(): Promise<TagSuggestRow[]> {
  try {
    const viaPg = await loadTagSuggestIndexViaPostgres();
    if (viaPg && viaPg.length > 0) {
      try {
        return await attachGanCountsViaPostgres(viaPg);
      } catch {
        return viaPg;
      }
    }
  } catch {
    /* Hyperdrive/TCP timeout trên Workers → Supabase HTTP. */
  }

  try {
    return await loadTagSuggestIndexViaSupabase();
  } catch {
    return [];
  }
}
