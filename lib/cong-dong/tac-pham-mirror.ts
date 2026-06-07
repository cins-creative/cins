import "server-only";

import type { CongDongJourneyMirror } from "@/lib/cong-dong/types";
import { fetchArticleTagsForTacPham } from "@/lib/journey/article-tags-batch";
import { milestonePreviewMedia } from "@/lib/journey/milestone-preview-media";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type TacPhamRow = {
  id: string;
  slug: string | null;
  tieu_de: string;
  mo_ta: string | null;
  cover_id: string | null;
  noi_dung_blocks: unknown;
  id_nguoi_dung: string;
  user_nguoi_dung: { slug: string } | null;
};

export async function loadTacPhamMirrorsByMilestoneIds(
  milestoneIds: string[],
): Promise<Map<string, CongDongJourneyMirror>> {
  const out = new Map<string, CongDongJourneyMirror>();
  const ids = [...new Set(milestoneIds.filter(Boolean))];
  if (ids.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, thu_tu, content_tac_pham(id, slug, tieu_de, mo_ta, cover_id, noi_dung_blocks, id_nguoi_dung, user_nguoi_dung: id_nguoi_dung(slug))",
    )
    .in("id_cot_moc", ids)
    .order("thu_tu", { ascending: true })
    .returns<
      Array<{
        id_cot_moc: string;
        thu_tu: number;
        content_tac_pham: TacPhamRow | null;
      }>
    >();

  for (const link of links ?? []) {
    if (out.has(link.id_cot_moc)) continue;
    const row = link.content_tac_pham;
    if (!row) continue;
    const blocks = parseServerBlocks(row.noi_dung_blocks) ?? [];
    const previewItems = milestonePreviewMedia(
      row.cover_id,
      blocks,
      row.tieu_de,
    );
    out.set(link.id_cot_moc, {
      tacPhamId: row.id,
      milestoneId: link.id_cot_moc,
      postSlug: row.slug ?? "",
      ownerSlug: row.user_nguoi_dung?.slug ?? "",
      tieuDe: row.tieu_de,
      moTa: row.mo_ta,
      coverId: row.cover_id,
      noiDungBlocks: blocks,
      previewMedia: previewItems[0] ?? null,
      articleTags: [],
    });
  }

  const tacPhamIds = [...new Set([...out.values()].map((m) => m.tacPhamId))];
  if (tacPhamIds.length > 0) {
    const tagsByTacPham = await fetchArticleTagsForTacPham(admin, tacPhamIds);
    for (const mirror of out.values()) {
      mirror.articleTags = tagsByTacPham.get(mirror.tacPhamId) ?? [];
    }
  }

  return out;
}

/** @deprecated — dùng `loadTacPhamMirrorsByMilestoneIds` */
export async function loadTacPhamMirrors(
  tacPhamIds: string[],
): Promise<Map<string, CongDongJourneyMirror>> {
  const out = new Map<string, CongDongJourneyMirror>();
  const ids = [...new Set(tacPhamIds.filter(Boolean))];
  if (ids.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_tac_pham")
    .select(
      "id, slug, tieu_de, mo_ta, cover_id, noi_dung_blocks, id_nguoi_dung, user_nguoi_dung: id_nguoi_dung(slug)",
    )
    .in("id", ids)
    .returns<TacPhamRow[]>();

  for (const row of data ?? []) {
    const blocks = parseServerBlocks(row.noi_dung_blocks) ?? [];
    const previewItems = milestonePreviewMedia(
      row.cover_id,
      blocks,
      row.tieu_de,
    );
    out.set(row.id, {
      tacPhamId: row.id,
      milestoneId: null,
      postSlug: row.slug ?? "",
      ownerSlug: row.user_nguoi_dung?.slug ?? "",
      tieuDe: row.tieu_de,
      moTa: row.mo_ta,
      coverId: row.cover_id,
      noiDungBlocks: blocks,
      previewMedia: previewItems[0] ?? null,
      articleTags: [],
    });
  }

  const loadedTacPhamIds = [...out.keys()];
  if (loadedTacPhamIds.length > 0) {
    const tagsByTacPham = await fetchArticleTagsForTacPham(admin, loadedTacPhamIds);
    for (const mirror of out.values()) {
      mirror.articleTags = tagsByTacPham.get(mirror.tacPhamId) ?? [];
    }
  }

  return out;
}
