import { allArticleNhomForHub, boPhanNhomsForHub } from "@/lib/career/articleNhomHub";
import { nhomThuTuFromCareers } from "@/lib/career/hubNhomOrder";
import type { LinhVucRow } from "@/lib/career/types";
import type { NgheNghiepHubItem } from "@/lib/career/types";

/** Một khối section trên hub nghề (tiêu đề + mô tả + lưới card). */
export type CareerHubSection = {
  id: string;
  /** `article_nhom.id` — null cho cụm 「Vị trí khác」 */
  nhomId: string | null;
  /** Thứ tự `article_nhom.thu_tu` */
  thu_tu: number;
  title: string;
  intro: string | null;
  careers: NgheNghiepHubItem[];
};

const OTHER_TITLE = "Vị trí khác";
const OTHER_INTRO =
  "Các vị trí chưa được gán nhóm bộ phận đầy đủ trong CSDL; danh sách vẫn hiển thị để bạn khám phá. Mở từng nghề để đọc chi tiết và định hướng phát triển.";

function jobSort(a: NgheNghiepHubItem, b: NgheNghiepHubItem): number {
  return (a.title_eng ?? a.title_vietnam ?? "").localeCompare(
    b.title_eng ?? b.title_vietnam ?? "",
    "vi",
    { sensitivity: "base" },
  );
}

/**
 * Nhóm theo mọi bộ phận trong `article_gan_nhom` (một bài có thể nằm nhiều section).
 * Khớp logic SQL: JOIN lv-game + JOIN từng bp-*.
 */
export function groupCareersByArticleNhomForLinhVuc(
  items: NgheNghiepHubItem[],
  activeLv: LinhVucRow | null,
): CareerHubSection[] {
  if (items.length === 0) return [];

  const byNhomId = new Map<string, NgheNghiepHubItem[]>();
  const ungrouped: NgheNghiepHubItem[] = [];

  for (const item of items) {
    const bps = boPhanNhomsForHub(item);
    if (bps.length === 0) {
      ungrouped.push(item);
      continue;
    }
    for (const nh of bps) {
      const arr = byNhomId.get(nh.id) ?? [];
      if (!arr.some((c) => c.id === item.id)) arr.push(item);
      byNhomId.set(nh.id, arr);
    }
  }

  return buildSectionsFromNhomMap(byNhomId, ungrouped);
}

/**
 * Nhóm bài nghề theo một `article_nhom` chính (legacy).
 * Mục không có nhóm nằm cuối, tiêu đề "Vị trí khác".
 */
export function groupCareersByArticleNhom(
  items: NgheNghiepHubItem[],
): CareerHubSection[] {
  if (items.length === 0) return [];

  const byNhomId = new Map<string, NgheNghiepHubItem[]>();
  const ungrouped: NgheNghiepHubItem[] = [];

  for (const item of items) {
    const nh = item.article_nhom;
    if (!nh?.id) {
      ungrouped.push(item);
      continue;
    }
    const arr = byNhomId.get(nh.id) ?? [];
    arr.push(item);
    byNhomId.set(nh.id, arr);
  }

  return buildSectionsFromNhomMap(byNhomId, ungrouped);
}

function buildSectionsFromNhomMap(
  byNhomId: Map<string, NgheNghiepHubItem[]>,
  ungrouped: NgheNghiepHubItem[],
): CareerHubSection[] {
  type Row = {
    id: string;
    thu_tu: number;
    title: string;
    intro: string | null;
    careers: NgheNghiepHubItem[];
  };

  const rows: Row[] = [];
  for (const [nhomId, careers] of byNhomId) {
    let nh =
      careers
        .flatMap((c) => allArticleNhomForHub(c))
        .find((n) => n.id === nhomId) ?? careers[0]?.article_nhom;
    const title = (nh?.ten ?? "").trim() || "Nhóm";
    const intro = (nh?.mo_ta ?? "").trim() || null;
    const thuTu = nhomThuTuFromCareers(nhomId, careers);
    rows.push({
      id: nhomId,
      thu_tu: thuTu,
      title,
      intro,
      careers: [...careers].sort(jobSort),
    });
  }

  rows.sort((a, b) => {
    if (a.thu_tu !== b.thu_tu) return a.thu_tu - b.thu_tu;
    return a.title.localeCompare(b.title, "vi", { sensitivity: "base" });
  });

  const sections: CareerHubSection[] = rows.map((r) => ({
    id: `career-sec-${r.id}`,
    nhomId: r.id,
    thu_tu: r.thu_tu,
    title: r.title,
    intro: r.intro,
    careers: r.careers,
  }));

  if (ungrouped.length > 0) {
    sections.push({
      id: "career-sec-other",
      nhomId: null,
      thu_tu: 99999,
      title: OTHER_TITLE,
      intro: OTHER_INTRO,
      careers: [...ungrouped].sort(jobSort),
    });
  }

  return sections;
}
