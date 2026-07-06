import "server-only";

import { swapCfImageVariant } from "@/lib/cloudflare/cf-variant-url";
import { fetchGalleryMainPage, fetchGalleryTotalCount } from "@/lib/journey/gallery-page-fetch";
import {
  formatTinhThanh,
  getAvatarUrl,
  getGiaiDoanLabel,
  getNameInitials,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type OgShareKind = "journey" | "gallery";

export type OgShareContext = {
  profile: JourneyShareProfile;
  displayTitle: string;
  description: string;
};

function ogImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return swapCfImageVariant(url, "public");
}

function truncateBio(text: string | null | undefined, max = 140): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** Dữ liệu hồ sơ cho OG image + metadata — chỉ profile công khai (`giai_doan` đã set). */
export async function fetchOgShareContext(
  slug: string,
  kind: OgShareKind,
): Promise<OgShareContext | null> {
  const { owner, error } = await fetchOwnerBySlug(slug);
  if (error || !owner || owner.giai_doan === null) return null;

  const admin = createServiceRoleClient();
  const [{ count: cotMoc }, galleryCount, galleryPage] = await Promise.all([
    admin
      .from("content_cot_moc")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_dung", owner.id),
    fetchGalleryTotalCount(owner.id),
    kind === "gallery"
      ? fetchGalleryMainPage({
          userId: owner.id,
          ownerSlug: slug,
          limit: 4,
        })
      : Promise.resolve(null),
  ]);

  const displayName = owner.ten_hien_thi?.trim() || owner.slug;
  const galleryThumbs =
    galleryPage?.items.map((item) => item.src).filter(Boolean).slice(0, 4) ??
    [];

  const profile: JourneyShareProfile = {
    slug: owner.slug,
    displayName,
    initials: getNameInitials(owner.ten_hien_thi, owner.slug),
    avatarUrl: ogImageUrl(getAvatarUrl(owner.avatar_id)),
    coverUrl: ogImageUrl(getProfileCoverUrl(owner.cover_id)),
    bio: truncateBio(owner.bio),
    roleLine: getGiaiDoanLabel(owner.giai_doan),
    locationLine: formatTinhThanh(owner.tinh_thanh),
    stats: {
      cotMoc: cotMoc ?? 0,
      tacPham: galleryCount,
    },
    galleryThumbs,
  };

  const isGallery = kind === "gallery";
  const displayTitle = isGallery
    ? `Portfolio · ${displayName}`
    : `Journey · ${displayName}`;
  const description = isGallery
    ? `${galleryCount} tác phẩm của ${displayName} trên CINs.`
    : truncateBio(owner.bio) ??
      `Hành trình sáng tạo của ${displayName} trên CINs.`;

  return { profile, displayTitle, description };
}
