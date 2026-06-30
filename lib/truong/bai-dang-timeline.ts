import { matchesPersonalFilterSlug } from "@/lib/filter/client-utils";
import { resolveBaiDangCardKind } from "@/lib/truong/bai-dang-blocks";
import type { TruongBaiDang } from "@/lib/truong/types";
import { normalizeLoaiBaiDang, type BaiDangLoai } from "@/lib/truong/bai-dang";
import { countImagesInBaiDangHtml } from "@/lib/truong/bai-dang-content";
import {
  isOrgBaiDangNhanFilterKey,
  orgBaiDangNhanSlugFromKey,
} from "@/lib/truong/org-bai-dang-filters.shared";

export type BaiDangTimelineFilter = "all" | BaiDangLoai;

/** `all` / loại bài đăng hoặc `nhan:<slug>` nhãn tùy chỉnh. */
export type OrgBaiDangTimelineFilterKey = BaiDangTimelineFilter | string;

export type BaiDangCardKind = "article" | "photo" | "video" | "text";

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

/** Giá trị cho `<input type="date">` từ `tao_luc`. */
export function baiDangDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** `YYYY-MM-DD` → ISO `tao_luc` — giữ giờ cũ nếu có. */
export function baiDangTaoLucFromDateInput(
  dateValue: string,
  previousIso?: string | null,
): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  let hours = 12;
  let minutes = 0;
  if (previousIso) {
    const prev = new Date(previousIso);
    if (!Number.isNaN(prev.getTime())) {
      hours = prev.getHours();
      minutes = prev.getMinutes();
    }
  }
  const local = new Date(y, mo, day, hours, minutes, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

export function sortBaiDangByTaoLuc(
  posts: ReadonlyArray<TruongBaiDang>,
): TruongBaiDang[] {
  return [...posts].sort((a, b) => {
    const pinA = a.ghim ? 1 : 0;
    const pinB = b.ghim ? 1 : 0;
    if (pinB !== pinA) return pinB - pinA;
    const ta = a.tao_luc ? new Date(a.tao_luc).getTime() : 0;
    const tb = b.tao_luc ? new Date(b.tao_luc).getTime() : 0;
    return tb - ta;
  });
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
        const pinA = a.ghim ? 1 : 0;
        const pinB = b.ghim ? 1 : 0;
        if (pinB !== pinA) return pinB - pinA;
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
    hoc_bong: 0,
    su_kien: 0,
    khac: 0,
  };
  for (const p of posts) {
    counts[normalizeLoaiBaiDang(p.loai_bai_dang)] += 1;
  }
  return counts;
}

export function filterBaiDangByTimelineKey(
  posts: ReadonlyArray<TruongBaiDang>,
  key: OrgBaiDangTimelineFilterKey,
): TruongBaiDang[] {
  const nhanSlug = orgBaiDangNhanSlugFromKey(key);
  if (nhanSlug) {
    return posts.filter((p) =>
      matchesPersonalFilterSlug(p.personalFilterSlugs, nhanSlug),
    );
  }
  return filterBaiDangPosts(posts, key as BaiDangTimelineFilter);
}

export function countBaiDangNhanFilters(
  posts: ReadonlyArray<TruongBaiDang>,
  slugs: ReadonlyArray<string>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const slug of slugs) counts[slug] = 0;
  for (const post of posts) {
    for (const slug of post.personalFilterSlugs ?? []) {
      if (counts[slug] !== undefined) counts[slug] += 1;
    }
  }
  return counts;
}

export function orgBaiDangTimelineFilterCount(
  key: OrgBaiDangTimelineFilterKey,
  loaiCounts: Record<BaiDangTimelineFilter, number>,
  nhanCounts: Record<string, number>,
): number {
  const nhanSlug = orgBaiDangNhanSlugFromKey(key);
  if (nhanSlug) return nhanCounts[nhanSlug] ?? 0;
  if (isOrgBaiDangNhanFilterKey(key)) return 0;
  return loaiCounts[key as BaiDangTimelineFilter] ?? 0;
}
