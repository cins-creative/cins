import "server-only";

import { cache } from "react";

import type { CongDongOgContext } from "@/lib/cong-dong/cong-dong-og-card";
import { loadCongDongLinhVucs } from "@/lib/cong-dong/linh-vuc";
import { countThanhVien } from "@/lib/cong-dong/membership";
import { fetchCongDongBySlug } from "@/lib/cong-dong/queries";
import { countCongDongPosts } from "@/lib/cong-dong/stats";
import { formatTinhThanh } from "@/lib/journey/profile";
import {
  ORG_AVATAR_VARIANTS,
  ORG_COVER_VARIANTS,
} from "@/lib/truong/org-image-variants";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

async function loadCongDongOgContext(
  slug: string,
): Promise<CongDongOgContext | null> {
  const slugNorm = slug.trim();
  if (!slugNorm) return null;
  try {
    const org = await fetchCongDongBySlug(slugNorm);
    if (!org) return null;

    const [soThanhVien, soBaiViet, linhVucs] = await Promise.all([
      countThanhVien(org.id),
      countCongDongPosts(org.id),
      loadCongDongLinhVucs(org.id),
    ]);

    const coverUrl = resolveTruongImageSrcSync(org.cover_id, ORG_COVER_VARIANTS);
    const avatarUrl = resolveTruongImageSrcSync(org.avatar_id, ORG_AVATAR_VARIANTS);
    const linhVucLabel =
      linhVucs.length > 0
        ? linhVucs.slice(0, 3).map((l) => l.ten).join(" · ")
        : null;

    return {
      title: org.ten?.trim() || slugNorm,
      linhVucLabel,
      summary: truncate(org.mo_ta, 165),
      coverUrl,
      avatarUrl,
      location: formatTinhThanh(org.tinh_thanh),
      soThanhVien,
      soBaiViet,
      verified: org.trang_thai_tin_cay === "verified_official",
      slug: org.slug?.trim() || slugNorm,
    };
  } catch {
    return null;
  }
}

/** OG context nhẹ cho trang cộng đồng. */
export const fetchCongDongOgContext = cache(loadCongDongOgContext);
