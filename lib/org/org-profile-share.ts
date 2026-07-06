import { absoluteShareUrl, type JourneyShareProfile } from "@/lib/journey/profile-share";
import { labelTinhThanh } from "@/lib/truong/contact";
import { schoolInitials, resolveSchoolAvatarSrc } from "@/lib/truong/school-avatar";
import { resolveSchoolCoverSrc } from "@/lib/truong/school-cover";
import { truongRootPath, truongTabPath } from "@/lib/truong/truong-routes";
import { coSoRootPath, coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { studioRootPath, studioTabPath } from "@/lib/to-chuc/studio-routes";

export type OrgShareKind = "co_so" | "truong" | "studio";

export type OrgShareContext = {
  kind: OrgShareKind;
  pagePath: string;
  galleryPath: string;
  /** Hiển thị dưới tiêu đề menu — vd. `co-so/my-org`. */
  pathLabel: string;
  /** Nhãn thay Portfolio: Bài học viên / Hình ảnh trường / Showcase. */
  galleryFeatureLabel: string;
};

export type OrgShareSource = {
  slug: string;
  ten: string;
  mo_ta?: string | null;
  moTa?: string | null;
  avatar_id?: string | null;
  logo_id?: string | null;
  avatar_src?: string | null;
  cover_id?: string | null;
  cover_src?: string | null;
  tinh_thanh?: string | null;
  tinhThanh?: string | null;
  avatarPreviewUrl?: string | null;
  coverPreviewUrl?: string | null;
  galleryThumbs?: string[];
  stats?: { cotMoc: number; tacPham: number };
};

const ORG_ROLE_LINES: Record<OrgShareKind, string> = {
  co_so: "Cơ sở đào tạo",
  truong: "Trường đại học",
  studio: "Doanh nghiệp",
};

const GALLERY_FEATURE_LABELS: Record<OrgShareKind, string> = {
  co_so: "Bài học viên",
  truong: "Hình ảnh trường",
  studio: "Showcase",
};

export function orgShareContextForKind(
  kind: OrgShareKind,
  slug: string,
): OrgShareContext {
  const s = slug.trim();
  if (kind === "co_so") {
    const pagePath = coSoRootPath(s);
    return {
      kind,
      pagePath,
      galleryPath: coSoTabPath(s, "san-pham"),
      pathLabel: pagePath.replace(/^\//, ""),
      galleryFeatureLabel: GALLERY_FEATURE_LABELS.co_so,
    };
  }
  if (kind === "truong") {
    const pagePath = truongRootPath(s);
    return {
      kind,
      pagePath,
      galleryPath: truongTabPath(s, "hinh-anh"),
      pathLabel: pagePath.replace(/^\//, ""),
      galleryFeatureLabel: GALLERY_FEATURE_LABELS.truong,
    };
  }
  const pagePath = studioRootPath(s);
  return {
    kind,
    pagePath,
    galleryPath: studioTabPath(s, "showcase"),
    pathLabel: pagePath.replace(/^\//, ""),
    galleryFeatureLabel: GALLERY_FEATURE_LABELS.studio,
  };
}

export function orgPageShareUrl(ctx: OrgShareContext): string {
  return absoluteShareUrl(ctx.pagePath);
}

export function orgGalleryShareUrl(ctx: OrgShareContext): string {
  return absoluteShareUrl(ctx.galleryPath);
}

export function buildOrgShareBundle(
  kind: OrgShareKind,
  source: OrgShareSource,
): { profile: JourneyShareProfile; orgShare: OrgShareContext } {
  const orgShare = orgShareContextForKind(kind, source.slug);
  const moTa = (source.mo_ta ?? source.moTa)?.trim() || null;
  const tinhThanh = source.tinh_thanh ?? source.tinhThanh ?? null;
  const schoolLike = {
    avatar_id: source.avatar_id ?? null,
    logo_id: source.logo_id ?? null,
    avatar_src: source.avatar_src ?? null,
    cover_id: source.cover_id ?? null,
    cover_src: source.cover_src ?? null,
  };

  const profile: JourneyShareProfile = {
    slug: orgShare.pathLabel,
    displayName: source.ten.trim() || source.slug,
    initials: schoolInitials(source.ten || source.slug),
    avatarUrl: resolveSchoolAvatarSrc(schoolLike, source.avatarPreviewUrl),
    coverUrl: resolveSchoolCoverSrc(schoolLike, source.coverPreviewUrl),
    bio: moTa,
    roleLine: ORG_ROLE_LINES[kind],
    locationLine: labelTinhThanh(tinhThanh) || null,
    galleryThumbs: source.galleryThumbs,
    stats: source.stats,
  };

  return { profile, orgShare };
}
