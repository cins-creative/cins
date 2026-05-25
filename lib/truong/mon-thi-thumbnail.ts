import { fetchCloudflareImageDeliveryUrl } from "@/lib/cloudflare/fetch-image-delivery-url";
import { getCoverUrl } from "@/lib/articles/cover";
import {
  getCfImageUrl,
  getCfImageUrlWithFallbacks,
} from "@/lib/truong/images";

/** Giá trị seed SQL — không phải Cloudflare id. */
export const MON_THI_PLACEHOLDER_IDS = {
  nang_khieu: "plh_nang_khieu",
  van_hoa: "plh_van_hoa",
  ngoai_ngu: "plh_ngoai_ngu",
  default: "plh_mon_thi",
} as const;

const PLACEHOLDER_STYLES: Record<
  string,
  { bg: string; fg: string; accent: string }
> = {
  nang_khieu: {
    bg: "linear-gradient(145deg, #ede5ff 0%, #d4c4fc 100%)",
    fg: "#5c2bb6",
    accent: "#7c4dff",
  },
  van_hoa: {
    bg: "linear-gradient(145deg, #e7f0fb 0%, #c5daf5 100%)",
    fg: "#1f4f8a",
    accent: "#1f74c9",
  },
  ngoai_ngu: {
    bg: "linear-gradient(145deg, #e6f7ef 0%, #b8ebd4 100%)",
    fg: "#0d5c3f",
    accent: "#0d7a52",
  },
  default: {
    bg: "linear-gradient(145deg, #f4f5f8 0%, #e4e6eb 100%)",
    fg: "#475569",
    accent: "#64748b",
  },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isMonThiPlaceholderId(
  thumbnailId: string | null | undefined,
): boolean {
  const id = thumbnailId?.trim();
  if (!id) return true;
  return id.startsWith("plh_");
}

export function isMonThiCloudflareImageId(
  thumbnailId: string | null | undefined,
): boolean {
  const id = thumbnailId?.trim();
  if (!id || isMonThiPlaceholderId(id)) return false;
  return UUID_RE.test(id) || id.length >= 16;
}

export function monThiPlaceholderStyle(
  loai: string | null | undefined,
): (typeof PLACEHOLDER_STYLES)["default"] {
  const key = loai?.trim().toLowerCase();
  if (key && key in PLACEHOLDER_STYLES) {
    return PLACEHOLDER_STYLES[key as keyof typeof PLACEHOLDER_STYLES];
  }
  return PLACEHOLDER_STYLES.default;
}

/** Mặc định khi chưa upload ảnh CF (khớp seed SQL `plh_*`). */
export function defaultPlaceholderThumbnailId(
  loai: string | null | undefined,
): string {
  const key = loai?.trim().toLowerCase();
  if (key === "nang_khieu") return MON_THI_PLACEHOLDER_IDS.nang_khieu;
  if (key === "van_hoa") return MON_THI_PLACEHOLDER_IDS.van_hoa;
  if (key === "ngoai_ngu") return MON_THI_PLACEHOLDER_IDS.ngoai_ngu;
  return MON_THI_PLACEHOLDER_IDS.default;
}

export function resolveCatalogThumbnailId(
  thumbnailId: string | null | undefined,
  loai: string | null | undefined,
): string {
  const id = thumbnailId?.trim();
  if (id) return id;
  return defaultPlaceholderThumbnailId(loai);
}

export function monThiPlaceholderInitials(
  ten: string,
  ma?: string | null,
): string {
  const fromMa = ma?.trim();
  if (fromMa && fromMa.length <= 4) {
    return fromMa.replace(/_/g, "").slice(0, 3).toUpperCase();
  }
  const parts = ten.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return ten.trim().slice(0, 2).toUpperCase() || "MT";
}

/** URL Cloudflare khi có ảnh thật; null → dùng placeholder UI. */
export function resolveMonThiThumbnailUrl(
  thumbnailId: string | null | undefined,
): string | null {
  if (!isMonThiCloudflareImageId(thumbnailId)) return null;
  return (
    getCfImageUrlWithFallbacks(thumbnailId, ["public", "avatar", "medium"]) ??
    getCfImageUrl(thumbnailId, "public")
  );
}

/** Server: URL ảnh môn (CF catalog hoặc cover bài viết hub). */
export async function resolveMonThiThumbDisplayUrl(input: {
  thumbnail_id?: string | null;
  id_bai_viet?: string | null;
  articleCoverById?: Map<string, string | null>;
}): Promise<string | null> {
  const fromCatalog = resolveMonThiThumbnailUrl(input.thumbnail_id);
  if (fromCatalog) return fromCatalog;

  if (isMonThiCloudflareImageId(input.thumbnail_id)) {
    const fetched = await fetchCloudflareImageDeliveryUrl(input.thumbnail_id);
    if (fetched) return fetched;
  }

  const baiId = input.id_bai_viet?.trim();
  if (baiId && input.articleCoverById?.has(baiId)) {
    return input.articleCoverById.get(baiId) ?? null;
  }

  return null;
}

export type MonThiThumbProps = {
  ten: string;
  loai?: string | null;
  ma?: string | null;
  thumbnail_id?: string | null;
  /** Resolve trên server — ưu tiên hơn client build URL (tránh thiếu CF account hash). */
  thumbnail_url?: string | null;
  className?: string;
};
