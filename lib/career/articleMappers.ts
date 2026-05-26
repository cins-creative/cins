import { getCoverUrl } from "@/lib/articles/cover";
import type { NgheArticleHubRow } from "@/lib/articles/types";
import type { NgheNghiepHubItem } from "@/lib/career/types";

/** Map bài `article_bai_viet` (loại nghe) → card hub nghề nghiệp. */
export function mapNgheArticleToHubItem(row: NgheArticleHubRow): NgheNghiepHubItem {
  return {
    id: row.id,
    slug: row.slug,
    title_eng: row.tieu_de_eng?.trim() || row.tieu_de,
    title_vietnam: row.tieu_de_viet?.trim() || row.tieu_de,
    short_description:
      row.tom_tat?.trim() || row.meta_description?.trim() || null,
    thumbnail_mascot:
      getCoverUrl(row.thumbnail) ?? getCoverUrl(row.cover_id),
    bo_phan: null,
    nn_bo_phan_id: null,
    nn_bo_phan: null,
    id_linh_vuc: row.id_linh_vuc ?? row.linh_vuc_id?.[0] ?? null,
    linh_vuc: row.linh_vuc ?? null,
    linh_vuc_id: row.linh_vuc_id,
    linh_vuc_slugs: row.linh_vuc_slugs,
    article_nhom_id: row.article_nhom_id ?? null,
    article_nhom: row.article_nhom ?? null,
    article_nhom_all: row.article_nhom_all ?? null,
  };
}

export function mapNgheArticlesToHubItems(
  rows: NgheArticleHubRow[],
): NgheNghiepHubItem[] {
  return rows.map(mapNgheArticleToHubItem);
}
