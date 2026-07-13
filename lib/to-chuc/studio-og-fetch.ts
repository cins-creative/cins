import "server-only";

import { formatTinhThanh } from "@/lib/journey/profile";
import type { OrgOgContext } from "@/lib/og/org-og-card";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  ORG_AVATAR_VARIANTS,
  ORG_COVER_VARIANTS,
} from "@/lib/truong/org-image-variants";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

type StudioRow = {
  slug: string;
  ten: string;
  mo_ta: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  tinh_thanh: string | null;
  loai_to_chuc: string;
  cau_hinh: Record<string, unknown> | null;
};

function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** OG context cho trang studio / doanh nghiệp (`/studio/[slug]`). */
export async function fetchStudioOgContext(
  slug: string,
): Promise<OrgOgContext | null> {
  const slugNorm = slug.trim();
  if (!slugNorm) return null;
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("org_to_chuc")
      .select(
        "slug, ten, mo_ta, avatar_id, cover_id, tinh_thanh, loai_to_chuc, cau_hinh",
      )
      .eq("slug", slugNorm)
      .in("loai_to_chuc", ["studio", "doanh_nghiep"])
      .maybeSingle<StudioRow>();
    if (error || !data) return null;

    const ten = data.ten?.trim();
    if (!ten) return null;

    const cauHinh = data.cau_hinh ?? {};
    const tenChinhThuc =
      typeof cauHinh.ten_chinh_thuc === "string"
        ? (cauHinh.ten_chinh_thuc as string).trim()
        : null;
    const subtitle =
      tenChinhThuc && tenChinhThuc.toLowerCase() !== ten.toLowerCase()
        ? tenChinhThuc
        : null;

    return {
      typeLabel: data.loai_to_chuc === "doanh_nghiep" ? "Doanh nghiệp" : "Studio",
      title: ten,
      subtitle,
      summary: truncate(data.mo_ta, 175),
      code: null,
      codeLabel: "",
      location: formatTinhThanh(data.tinh_thanh),
      coverUrl: resolveTruongImageSrcSync(data.cover_id, ORG_COVER_VARIANTS),
      avatarUrl: resolveTruongImageSrcSync(data.avatar_id, ORG_AVATAR_VARIANTS),
      pathPrefix: "studio",
      tagline: "Studio ngành sáng tạo",
    };
  } catch {
    return null;
  }
}
