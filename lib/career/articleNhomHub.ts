import type { ArticleNhomHubEmbed, LinhVucRow, NgheNghiepHubItem } from "@/lib/career/types";



export function allArticleNhomForHub(

  item: Pick<NgheNghiepHubItem, "article_nhom" | "article_nhom_all">,

): ArticleNhomHubEmbed[] {

  if (item.article_nhom_all?.length) return item.article_nhom_all;

  return item.article_nhom ? [item.article_nhom] : [];

}



function sortNhomByThuTu(a: ArticleNhomHubEmbed, b: ArticleNhomHubEmbed): number {

  if (a.thu_tu !== b.thu_tu) return a.thu_tu - b.thu_tu;

  return a.ten.localeCompare(b.ten, "vi", { sensitivity: "base" });

}



/** `article_nhom.loai_nhom = bo_phan` (bộ phận trong lĩnh vực). */

export function isBoPhanLoaiNhom(nh: ArticleNhomHubEmbed): boolean {

  return nh.loai_nhom.trim().toLowerCase() === "bo_phan";

}



/**

 * Các `article_nhom` bộ phận từ `article_gan_nhom` (một bài có thể nhiều bộ phận).

 */

export function boPhanNhomsForHub(

  item: Pick<NgheNghiepHubItem, "article_nhom" | "article_nhom_all">,

): ArticleNhomHubEmbed[] {

  return allArticleNhomForHub(item)

    .filter(isBoPhanLoaiNhom)

    .sort(sortNhomByThuTu);

}



/** Mọi id `article_nhom` bộ phận trên danh sách bài (catalog thứ tự). */

export function collectBoPhanNhomIdsForHub(items: NgheNghiepHubItem[]): string[] {

  const ids = new Set<string>();

  for (const item of items) {

    for (const nh of boPhanNhomsForHub(item)) {

      ids.add(nh.id);

    }

  }

  return [...ids];

}



/** Nhóm section: ưu tiên bộ phận đầu tiên từ `article_gan_nhom`. */

export function resolveArticleNhomForLinhVuc(

  item: Pick<NgheNghiepHubItem, "article_nhom" | "article_nhom_all" | "article_nhom_id">,

): ArticleNhomHubEmbed | null {

  const departments = boPhanNhomsForHub(item);

  if (departments.length) return departments[0];



  const all = allArticleNhomForHub(item);

  if (!all.length) return null;

  return [...all].sort(sortNhomByThuTu)[0];

}



export function withDisplayArticleNhomForHub(

  item: NgheNghiepHubItem,

): NgheNghiepHubItem {

  const nh = resolveArticleNhomForLinhVuc(item);

  return {

    ...item,

    article_nhom: nh,

    article_nhom_id: nh?.id ?? item.article_nhom_id ?? null,

  };

}



/** Bài thuộc lĩnh vực đang chọn — qua `article_bai_viet.id_linh_vuc`. */

export function careerMatchesActiveLinhVuc(

  n: NgheNghiepHubItem,

  activeLv: LinhVucRow,

): boolean {

  const lvId = activeLv.id.trim();

  if (!lvId) return false;

  if (n.id_linh_vuc?.trim() === lvId) return true;

  if ((n.linh_vuc_id ?? []).includes(lvId)) return true;

  const sl = (activeLv.slug ?? "").trim().toLowerCase();

  if (!sl) return false;

  const slCore = sl.replace(/^lv-/, "");

  const embedSlug = n.linh_vuc?.slug?.trim().toLowerCase();

  if (embedSlug && (embedSlug === sl || embedSlug.replace(/^lv-/, "") === slCore)) {

    return true;

  }

  return (n.linh_vuc_slugs ?? []).some((x) => {

    const xs = x.trim().toLowerCase();

    if (!xs) return false;

    return xs === sl || xs.replace(/^lv-/, "") === slCore;

  });

}



export function linhVucLabelForHubItem(item: NgheNghiepHubItem): string | null {

  const t = item.linh_vuc?.ten?.trim();

  return t || null;

}

