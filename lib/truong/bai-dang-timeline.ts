import { resolveBaiDangCardKind } from "@/lib/truong/bai-dang-blocks";
import type { TruongBaiDang } from "@/lib/truong/types";
import { normalizeLoaiBaiDang, type BaiDangLoai } from "@/lib/truong/bai-dang";
import { countImagesInBaiDangHtml } from "@/lib/truong/bai-dang-content";

export type BaiDangTimelineFilter = "all" | BaiDangLoai;

export type BaiDangCardKind = "article" | "photo" | "video";

const VIDEO_HTML_RE =
  /<video\b|youtube\.com|youtu\.be|data-youtube|iframe[^>]+youtube/i;

function baiDangCardKindFromLegacy(post: TruongBaiDang): BaiDangCardKind {
  const html = post.noi_dung ?? "";
  if (VIDEO_HTML_RE.test(html)) return "video";
  if (post.cover_id || post.cover_src || countImagesInBaiDangHtml(html) > 0) {
    return "photo";
  }
  return "article";
}

export function baiDangCardKind(post: TruongBaiDang): BaiDangCardKind {
  return resolveBaiDangCardKind(post, baiDangCardKindFromLegacy);
}

export function baiDangYear(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

export function baiDangMonthLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Tháng ${d.getMonth() + 1}`;
}

export function formatBaiDangDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function groupBaiDangByYear(
  posts: ReadonlyArray<TruongBaiDang>,
): { year: number; posts: TruongBaiDang[] }[] {
  const map = new Map<number, TruongBaiDang[]>();
  for (const post of posts) {
    const y = baiDangYear(post.tao_luc) ?? new Date().getFullYear();
    const bucket = map.get(y);
    if (bucket) bucket.push(post);
    else map.set(y, [post]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, yearPosts]) => ({
      year,
      posts: [...yearPosts].sort((a, b) => {
        const ta = a.tao_luc ? new Date(a.tao_luc).getTime() : 0;
        const tb = b.tao_luc ? new Date(b.tao_luc).getTime() : 0;
        return tb - ta;
      }),
    }));
}

export function filterBaiDangPosts(
  posts: ReadonlyArray<TruongBaiDang>,
  filter: BaiDangTimelineFilter,
): TruongBaiDang[] {
  if (filter === "all") return [...posts];
  return posts.filter((p) => normalizeLoaiBaiDang(p.loai_bai_dang) === filter);
}

export function countBaiDangByFilter(
  posts: ReadonlyArray<TruongBaiDang>,
): Record<BaiDangTimelineFilter, number> {
  const counts: Record<BaiDangTimelineFilter, number> = {
    all: posts.length,
    thong_bao: 0,
    tuyen_sinh: 0,
    su_kien: 0,
    khac: 0,
  };
  for (const p of posts) {
    counts[normalizeLoaiBaiDang(p.loai_bai_dang)] += 1;
  }
  return counts;
}
