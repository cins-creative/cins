import { coSoTabPath, CO_SO_DEFAULT_TAB } from "@/lib/to-chuc/co-so-routes";
import { studioTabPath, STUDIO_DEFAULT_TAB } from "@/lib/to-chuc/studio-routes";
import { truongTabPath, TRUONG_DEFAULT_TAB } from "@/lib/truong/truong-routes";
import type { TruongListItem } from "@/lib/truong/types";

export type OrgBaiDangPermalinkHub = "truong" | "co-so" | "studio";

/** Anchor id của card bài đăng trên timeline org. */
export function orgBaiDangPostElementId(postId: string): string {
  return `org-post-${postId}`;
}

function baiDangTabBasePath(
  orgSlug: string,
  hub: OrgBaiDangPermalinkHub,
): string {
  switch (hub) {
    case "co-so":
      return coSoTabPath(orgSlug, CO_SO_DEFAULT_TAB);
    case "studio":
      return studioTabPath(orgSlug, STUDIO_DEFAULT_TAB);
    default:
      return truongTabPath(orgSlug, TRUONG_DEFAULT_TAB);
  }
}

/** Path + hash tới bài đăng trên tab Bài đăng của org. */
export function orgBaiDangPermalinkPath(
  orgSlug: string,
  postId: string,
  hub: OrgBaiDangPermalinkHub = "truong",
): string {
  return `${baiDangTabBasePath(orgSlug, hub)}#${orgBaiDangPostElementId(postId)}`;
}

/** Suy ra hub từ pathname hiện tại (client). */
export function orgBaiDangHubFromPathname(pathname: string): OrgBaiDangPermalinkHub {
  if (pathname.startsWith("/co-so/")) return "co-so";
  if (pathname.startsWith("/studio/")) return "studio";
  return "truong";
}

export function orgBaiDangPermalinkForSchool(
  school: Pick<TruongListItem, "slug" | "org_loai">,
  postId: string,
  pathname?: string,
): string {
  const hub =
    pathname != null
      ? orgBaiDangHubFromPathname(pathname)
      : school.org_loai === "co_so_dao_tao"
        ? "co-so"
        : "truong";
  return orgBaiDangPermalinkPath(school.slug, postId, hub);
}

/** URL tuyệt đối (client) — fallback path tương đối khi không có `window`. */
export function orgBaiDangAbsolutePermalink(
  school: Pick<TruongListItem, "slug" | "org_loai">,
  postId: string,
  pathname?: string,
): string {
  const path = orgBaiDangPermalinkForSchool(school, postId, pathname);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return base ? `${base}${path}` : path;
}
