import { personalFilterSlugFromSearch } from "@/lib/filter/client-utils";
import type { JourneyGalleryFilterShareSpec } from "@/lib/journey/gallery-filter-share";
import { absoluteShareUrl } from "@/lib/journey/profile-share";
import type { OrgShareContext } from "@/lib/org/org-profile-share";
import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { studioTabPath } from "@/lib/to-chuc/studio-routes";
import { truongTabPath } from "@/lib/truong/truong-routes";
import { orgBaiDangNhanFilterKey } from "@/lib/truong/org-bai-dang-filters.shared";
import type {
  BaiDangTimelineFilter,
  OrgBaiDangTimelineFilterKey,
} from "@/lib/truong/bai-dang-timeline";

/** Spec chia sẻ view tab Bài đăng org — tái dùng shape Journey gallery filter. */
export type OrgBaiDangFilterShareSpec = JourneyGalleryFilterShareSpec;

function orgBaiDangTabPath(ctx: OrgShareContext): string {
  const slug = ctx.pathLabel.split("/").pop()?.trim() || "";
  if (ctx.kind === "studio") return studioTabPath(slug, "bai-dang");
  if (ctx.kind === "co_so") return coSoTabPath(slug, "bai-dang");
  if (ctx.kind === "truong") return truongTabPath(slug, "bai-dang");
  return ctx.pagePath;
}

/**
 * Deep link lọc Bài đăng org — studio: `/studio/{slug}/bai-dang?filter=…`.
 * Không dùng Showcase (galleryPath); nhãn thuộc tab Bài đăng.
 */
export function orgBaiDangFilterShareUrl(
  ctx: OrgShareContext,
  spec: OrgBaiDangFilterShareSpec,
): string {
  const params = new URLSearchParams();
  if (spec.kind === "personal-label") {
    params.set("filter", spec.slug);
  } else if (spec.kind === "group" && spec.group !== "all") {
    params.set("nhom", spec.group);
  }
  const path = orgBaiDangTabPath(ctx);
  const qs = params.toString();
  return absoluteShareUrl(qs ? `${path}?${qs}` : path);
}

/** Đọc `?filter=` → key timeline `nhan:<slug>` (hoặc `all`). */
export function orgBaiDangFilterKeyFromSearch(
  search: string,
): OrgBaiDangTimelineFilterKey {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const personalSlug = personalFilterSlugFromSearch(q);
  if (personalSlug) return orgBaiDangNhanFilterKey(personalSlug);

  const nhom = new URLSearchParams(q).get("nhom")?.trim();
  if (nhom && nhom !== "all") {
    return nhom as BaiDangTimelineFilter;
  }
  return "all";
}

export const ORG_BAI_DANG_ALL_FILTER_SHARE_SPEC: OrgBaiDangFilterShareSpec = {
  kind: "all",
  label: "Tất cả",
};
