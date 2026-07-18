import "server-only";

import {
  getConfiguredSiteOrigin,
  getConfiguredSiteUrl,
  normalizeSiteHostname,
  siteHostnamesEquivalent,
} from "@/lib/auth/auth-origin";
import { fetchNgheOgContext } from "@/lib/articles/nghe-og-fetch";
import { fetchCongDongOgContext } from "@/lib/cong-dong/cong-dong-og-fetch";
import {
  formatTinhThanh,
  getAvatarUrl,
  getGiaiDoanLabel,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";
import { fetchPostOgContext } from "@/lib/journey/post-og-fetch";
import { resolveShareLink } from "@/lib/journey/share-link";
import type { LinkOgPreview } from "@/lib/link/og-preview";
import { fetchNganhOgContext } from "@/lib/nganh/nganh-og-fetch";
import { fetchCoSoOgContext } from "@/lib/to-chuc/co-so-og-fetch";
import { fetchKhoaHocOgContext } from "@/lib/to-chuc/khoa-hoc-og-fetch";
import { fetchStudioOgContext } from "@/lib/to-chuc/studio-og-fetch";
import { fetchJobOgContext } from "@/lib/to-chuc/tuyen-dung-og-fetch";
import { fetchTruongOgContext } from "@/lib/truong/truong-og-fetch";

/** Segment đầu không phải Journey `/{slug}`. */
const RESERVED_TOP_SEGMENTS = new Set([
  "admin",
  "api",
  "auth",
  "bai-viet",
  "chat",
  "co-so",
  "co-so-dao-tao",
  "cong-dong",
  "ho-tro",
  "huong-nghiep",
  "keyword",
  "kham-pha",
  "login",
  "luoi",
  "maintenance",
  "nganh",
  "nganh-hoc",
  "nghe-nghiep",
  "onboarding",
  "s",
  "software",
  "studio",
  "su-kien",
  "tao-to-chuc",
  "termandservice",
  "thong-tin-du-an",
  "tim-khoa-hoc",
  "tim-kiem",
  "tuyen-dung",
  "assets",
  "_next",
]);

function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function siteOrigin(): string {
  return getConfiguredSiteOrigin() ?? "https://cins.vn";
}

function canonicalUrl(pathname: string, search = ""): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${siteOrigin()}${path}${search}`;
}

/** Host thuộc CINs production hoặc đúng `NEXT_PUBLIC_SITE_URL` (dev). */
export function isCinsSiteUrl(url: URL): boolean {
  const host = normalizeSiteHostname(url.hostname);
  if (host === "cins.vn") return true;
  const configured = getConfiguredSiteUrl();
  if (
    configured &&
    siteHostnamesEquivalent(url.hostname, configured.hostname)
  ) {
    return true;
  }
  return false;
}

function cinsPreview(
  partial: Omit<LinkOgPreview, "siteName" | "source"> & {
    siteName?: string | null;
  },
): LinkOgPreview {
  return {
    ...partial,
    siteName: partial.siteName ?? "CINs",
    source: "cins",
  };
}

function joinMeta(parts: Array<string | null | undefined>): string | null {
  const out = parts.map((p) => p?.trim()).filter(Boolean) as string[];
  return out.length > 0 ? out.join(" · ") : null;
}

async function resolveJourney(
  slug: string,
  url: URL,
): Promise<LinkOgPreview | null> {
  const { owner } = await fetchOwnerBySlug(slug);
  if (!owner) return null;

  const view = url.searchParams.get("view");
  const isGallery = view === "gallery";
  const keep = new URLSearchParams();
  if (view) keep.set("view", view);
  const nhom = url.searchParams.get("nhom");
  const filter = url.searchParams.get("filter");
  if (nhom) keep.set("nhom", nhom);
  if (filter) keep.set("filter", filter);
  const qs = keep.toString();

  const giaiDoan = owner.giai_doan
    ? getGiaiDoanLabel(owner.giai_doan)
    : null;
  return cinsPreview({
    url: canonicalUrl(`/${owner.slug}`, qs ? `?${qs}` : ""),
    title: owner.ten_hien_thi?.trim() || owner.slug,
    description: truncate(owner.bio ?? owner.ai_summary_journey, 160),
    image: getProfileCoverUrl(owner.cover_id),
    avatar: getAvatarUrl(owner.avatar_id),
    badge: isGallery ? "Portfolio" : "Journey",
    subtitle: giaiDoan,
    meta: formatTinhThanh(owner.tinh_thanh),
    kind: "journey",
  });
}

async function resolveFromPath(url: URL): Promise<LinkOgPreview | null> {
  const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length === 0) {
    return cinsPreview({
      url: canonicalUrl("/"),
      title: "CINs",
      description: "Mạng xã hội chuyên môn cho ngành sáng tạo Việt Nam",
      image: null,
      avatar: null,
      badge: "CINs",
      subtitle: null,
      meta: null,
    });
  }

  const [a, b, c, d] = parts;

  /* /s/:token — short share link */
  if (a === "s" && b && parts.length === 2) {
    const share = await resolveShareLink(b);
    if (!share) return null;
    return cinsPreview({
      url: canonicalUrl(`/s/${share.token}`),
      title: share.title,
      description: truncate(share.description, 160),
      image: share.imageUrl,
      avatar: null,
      badge: "Chia sẻ",
      subtitle: null,
      meta: null,
    });
  }

  /* /studio/:slug[/…] */
  if (a === "studio" && b) {
    if (c === "tuyen-dung" && d) {
      const job = await fetchJobOgContext(b, d);
      if (!job) return null;
      return cinsPreview({
        url: canonicalUrl(`/${job.pathPrefix}/${job.orgSlug}/tuyen-dung/${job.jobId}`),
        title: job.title,
        description: truncate(job.summary, 160),
        image: job.coverUrl,
        avatar: job.orgAvatarUrl,
        badge: "Tuyển dụng",
        subtitle: job.orgTen,
        meta: joinMeta([
          job.loaiHinhLabel,
          job.place,
          job.salary,
          job.expired ? "Đã hết hạn" : job.deadline ? `Hạn ${job.deadline}` : null,
        ]),
        kind: "org",
      });
    }
    const studio = await fetchStudioOgContext(b);
    if (!studio) return null;
    return cinsPreview({
      url: canonicalUrl(`/studio/${b}`),
      title: studio.title,
      description: truncate(studio.summary, 160),
      image: studio.coverUrl,
      avatar: studio.avatarUrl,
      badge: studio.typeLabel,
      subtitle: studio.subtitle,
      meta: studio.location,
      kind: "org",
    });
  }

  /* /co-so/:slug[/…] */
  if (a === "co-so" && b) {
    if (c === "tuyen-dung" && d) {
      const job = await fetchJobOgContext(b, d);
      if (!job) return null;
      return cinsPreview({
        url: canonicalUrl(`/${job.pathPrefix}/${job.orgSlug}/tuyen-dung/${job.jobId}`),
        title: job.title,
        description: truncate(job.summary, 160),
        image: job.coverUrl,
        avatar: job.orgAvatarUrl,
        badge: "Tuyển dụng",
        subtitle: job.orgTen,
        meta: joinMeta([
          job.loaiHinhLabel,
          job.place,
          job.salary,
          job.expired ? "Đã hết hạn" : job.deadline ? `Hạn ${job.deadline}` : null,
        ]),
        kind: "org",
      });
    }
    if (c === "khoa-hoc" && d) {
      const khoa = await fetchKhoaHocOgContext(b, d);
      if (!khoa) return null;
      return cinsPreview({
        url: canonicalUrl(`/co-so/${khoa.orgSlug}/khoa-hoc/${khoa.khoaSlug}`),
        title: khoa.title,
        description: truncate(khoa.summary, 160),
        image: khoa.coverUrl,
        avatar: khoa.orgAvatarUrl,
        badge: "Khóa học",
        subtitle: khoa.orgTen,
        meta: joinMeta([
          khoa.moHinhLabel,
          khoa.trinhDoLabel,
          khoa.hocPhiLabel === "Liên hệ"
            ? "Liên hệ học phí"
            : `${khoa.hocPhiLabel}${khoa.hocPhiSuffix}`,
          khoa.trangThaiLabel,
        ]),
        kind: "org",
      });
    }
    const coSo = await fetchCoSoOgContext(b);
    if (!coSo) return null;
    return cinsPreview({
      url: canonicalUrl(`/co-so/${b}`),
      title: coSo.title,
      description: truncate(coSo.summary, 160),
      image: coSo.coverUrl,
      avatar: coSo.avatarUrl,
      badge: coSo.typeLabel,
      subtitle: coSo.subtitle,
      meta: joinMeta([
        coSo.location,
        coSo.code ? `${coSo.codeLabel} ${coSo.code}` : null,
      ]),
      kind: "org",
    });
  }

  /* /co-so-dao-tao/:slug — trường đại học */
  if (a === "co-so-dao-tao" && b) {
    const truong = await fetchTruongOgContext(b);
    if (!truong) return null;
    return cinsPreview({
      url: canonicalUrl(`/co-so-dao-tao/${b}`),
      title: truong.title,
      description: truncate(truong.summary, 160),
      image: truong.coverUrl,
      avatar: truong.avatarUrl,
      badge: truong.typeLabel,
      subtitle: truong.subtitle,
      meta: joinMeta([
        truong.location,
        truong.code ? `${truong.codeLabel} ${truong.code}` : null,
      ]),
      kind: "org",
    });
  }

  /* /cong-dong/:slug */
  if (a === "cong-dong" && b) {
    const cd = await fetchCongDongOgContext(b);
    if (!cd) return null;
    return cinsPreview({
      url: canonicalUrl(`/cong-dong/${cd.slug}`),
      title: cd.title,
      description: truncate(cd.summary, 160),
      image: cd.coverUrl,
      avatar: cd.avatarUrl,
      badge: cd.verified ? "Cộng đồng · Verified" : "Cộng đồng",
      subtitle: cd.linhVucLabel,
      meta: joinMeta([
        cd.location,
        `${cd.soThanhVien.toLocaleString("vi-VN")} thành viên`,
        `${cd.soBaiViet.toLocaleString("vi-VN")} bài`,
      ]),
      kind: "cong_dong",
    });
  }

  /* /nghe-nghiep/:slug */
  if (a === "nghe-nghiep" && b) {
    const nghe = await fetchNgheOgContext(b);
    if (!nghe) return null;
    return cinsPreview({
      url: canonicalUrl(`/nghe-nghiep/${b}`),
      title: nghe.title,
      description: truncate(nghe.summary, 160),
      image: nghe.coverUrl,
      avatar: null,
      badge: "Nghề nghiệp",
      subtitle: nghe.subtitle ?? nghe.linhVuc,
      meta: nghe.linhVuc && nghe.subtitle ? nghe.linhVuc : null,
    });
  }

  /* /nganh-hoc/:slug */
  if (a === "nganh-hoc" && b) {
    const nganh = await fetchNganhOgContext(b);
    if (!nganh) return null;
    return cinsPreview({
      url: canonicalUrl(`/nganh-hoc/${b}`),
      title: nganh.title,
      description: truncate(nganh.summary, 160),
      image: nganh.coverUrl,
      avatar: null,
      badge: "Ngành học",
      subtitle: nganh.subtitle,
      meta: joinMeta([
        nganh.maNganh ? `Mã ${nganh.maNganh}` : null,
        nganh.khoiThi.length > 0 ? nganh.khoiThi.slice(0, 4).join(", ") : null,
      ]),
    });
  }

  /* /:slug/p/:postSlug — bài Journey */
  if (a && b === "p" && c && !RESERVED_TOP_SEGMENTS.has(a)) {
    const post = await fetchPostOgContext(a, c);
    if (!post) return null;
    return cinsPreview({
      url: canonicalUrl(`/${post.ownerSlug}/p/${post.postSlug}`),
      title: post.title,
      description: truncate(post.summary, 160),
      image: post.coverUrl,
      /* Không gắn avatar tác giả — card bài chỉ cover + title + mô tả. */
      avatar: null,
      badge: "Bài viết",
      subtitle: post.authorName,
      meta: post.dateLabel,
      kind: "bai_viet",
    });
  }

  /* /:slug — Journey profile */
  if (parts.length === 1 && a && !RESERVED_TOP_SEGMENTS.has(a)) {
    return resolveJourney(a, url);
  }

  /* /:slug/journey → cùng Journey */
  if (parts.length === 2 && a && b === "journey" && !RESERVED_TOP_SEGMENTS.has(a)) {
    return resolveJourney(a, url);
  }

  return null;
}

/**
 * Resolve preview giàu cho URL nội bộ CINs (DB, không scrape HTML).
 * Trả null nếu không phải host CINs / không map được entity.
 */
export async function fetchCinsInternalLinkPreview(
  rawUrl: string,
): Promise<LinkOgPreview | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!isCinsSiteUrl(url)) return null;

  try {
    return await resolveFromPath(url);
  } catch {
    return null;
  }
}
