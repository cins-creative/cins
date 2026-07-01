import { articlePublicHref } from "@/lib/articles/article-href";
import { coSoTabPath, CO_SO_DEFAULT_TAB } from "@/lib/to-chuc/co-so-routes";
import { studioTabPath, STUDIO_DEFAULT_TAB } from "@/lib/to-chuc/studio-routes";
import {
  orgBaiDangPermalinkPath,
  type OrgBaiDangPermalinkHub,
} from "@/lib/truong/org-bai-dang-permalink";
import { truongRootPath, truongTabPath, TRUONG_DEFAULT_TAB } from "@/lib/truong/truong-routes";

/** Escape ký tự đặc biệt ILIKE (`%`, `_`, `,`). */
export function escapeIlikePattern(raw: string): string {
  return raw.replace(/[%_,]/g, "\\$&");
}

/** Plain text từ HTML — phục vụ rank tier «nội dung». */
export function stripHtmlToPlainText(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const plain = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  return plain || null;
}

export function articleLoaiLabel(loai: string): string {
  switch (loai) {
    case "nghe":
      return "Nghề nghiệp";
    case "nganh_dao_tao":
      return "Ngành đào tạo";
    case "mon_hoc":
      return "Môn học";
    case "keyword":
      return "Từ khóa";
    case "phan_mem":
      return "Phần mềm";
    case "blog":
      return "Bài viết";
    default:
      return "Kiến thức";
  }
}

export function orgLoaiLabel(loai: string): string {
  switch (loai) {
    case "truong_dai_hoc":
      return "Trường đại học";
    case "co_so_dao_tao":
      return "Cơ sở đào tạo";
    case "studio":
    case "doanh_nghiep":
      return "Studio";
    case "cong_dong":
      return "Cộng đồng";
    default:
      return "Tổ chức";
  }
}

export function orgPublicHref(loai: string, slug: string): string {
  const s = slug.trim();
  if (!s) return "/";
  if (loai === "cong_dong") return `/cong-dong/${encodeURIComponent(s)}`;
  if (loai === "co_so_dao_tao") return `/co-so/${encodeURIComponent(s)}`;
  if (loai === "studio" || loai === "doanh_nghiep") {
    return `/studio/${encodeURIComponent(s)}`;
  }
  if (loai === "truong_dai_hoc") return truongRootPath(s);
  return truongRootPath(s);
}

function orgBaiDangHub(loai: string): OrgBaiDangPermalinkHub {
  if (loai === "co_so_dao_tao") return "co-so";
  if (loai === "studio" || loai === "doanh_nghiep") return "studio";
  return "truong";
}

export function orgPostHref(
  orgLoai: string,
  orgSlug: string,
  postId: string,
): string {
  return orgBaiDangPermalinkPath(orgSlug, postId, orgBaiDangHub(orgLoai));
}

export function userPostHref(userSlug: string, postSlug: string | null): string {
  const user = userSlug.trim();
  if (!user) return "/";
  if (postSlug?.trim()) {
    return `/${encodeURIComponent(user)}/p/${encodeURIComponent(postSlug.trim())}`;
  }
  return `/${encodeURIComponent(user)}/journey`;
}

export function userJourneyHref(userSlug: string): string {
  const user = userSlug.trim();
  return user ? `/${encodeURIComponent(user)}/journey` : "/";
}

export function articleHref(loai: string, slug: string): string {
  return articlePublicHref(loai, slug);
}

export function orgDefaultTabHref(loai: string, slug: string): string {
  const s = slug.trim();
  if (!s) return orgPublicHref(loai, slug);
  if (loai === "co_so_dao_tao") return coSoTabPath(s, CO_SO_DEFAULT_TAB);
  if (loai === "studio" || loai === "doanh_nghiep") {
    return studioTabPath(s, STUDIO_DEFAULT_TAB);
  }
  if (loai === "truong_dai_hoc") return truongTabPath(s, TRUONG_DEFAULT_TAB);
  return orgPublicHref(loai, slug);
}
