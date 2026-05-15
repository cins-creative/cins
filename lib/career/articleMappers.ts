import { getCoverUrl } from "@/lib/articles/cover";
import type { NgheArticleHubRow } from "@/lib/articles/types";
import type { NgheNghiepHubItem } from "@/lib/career/types";

/** Map bài `article_bai_viet` (loại nghe) → card hub nghề nghiệp. */
export function mapNgheArticleToHubItem(row: NgheArticleHubRow): NgheNghiepHubItem {
  return {
    id: row.id,
    slug: row.slug,
    title_eng: row.tieu_de_eng?.trim() || row.tieu_de,
    title_vietnam: row.tieu_de,
    short_description: row.tom_tat,
    thumbnail_mascot: getCoverUrl(row.cover_id),
    bo_phan: null,
    nn_bo_phan_id: null,
    nn_bo_phan: null,
    linh_vuc_id: row.linh_vuc_id,
  };
}

export function mapNgheArticlesToHubItems(
  rows: NgheArticleHubRow[],
): NgheNghiepHubItem[] {
  return rows.map(mapNgheArticleToHubItem);
}
