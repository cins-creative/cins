import "server-only";

import { formatTinhThanh } from "@/lib/journey/profile";
import type { OrgOgContext } from "@/lib/og/org-og-card";
import {
  ORG_AVATAR_VARIANTS,
  ORG_COVER_VARIANTS,
} from "@/lib/truong/org-image-variants";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const TRUONG_OG_SELECT =
  "id, slug, ten, mo_ta, avatar_id, cover_id, tinh_thanh, org_truong_dai_hoc(ma_truong, ten_tieng_anh)";

type DaiHocEmbed = {
  ma_truong?: string | null;
  ten_tieng_anh?: string | null;
};

function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function pickEmbed(raw: unknown): DaiHocEmbed | null {
  if (Array.isArray(raw)) return (raw[0] as DaiHocEmbed) ?? null;
  if (raw && typeof raw === "object") return raw as DaiHocEmbed;
  return null;
}

/** OG context cho trang trường đại học (`/co-so-dao-tao/[slug]`). */
export async function fetchTruongOgContext(
  slug: string,
): Promise<OrgOgContext | null> {
  if (!hasSupabaseEnv()) return null;
  const slugNorm = slug.trim();
  if (!slugNorm) return null;
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("org_to_chuc")
      .select(TRUONG_OG_SELECT)
      .eq("slug", slugNorm)
      .maybeSingle();
    if (error || !data) return null;

    const r = data as Record<string, unknown>;
    const ten = String(r.ten ?? "").trim();
    if (!ten) return null;

    const embed = pickEmbed(r.org_truong_dai_hoc);
    const tenTiengAnh = embed?.ten_tieng_anh?.trim() || null;
    const subtitle =
      tenTiengAnh && tenTiengAnh.toLowerCase() !== ten.toLowerCase()
        ? tenTiengAnh
        : null;

    const coverUrl = resolveTruongImageSrcSync(
      (r.cover_id as string | null) ?? null,
      ORG_COVER_VARIANTS,
    );
    const avatarUrl = resolveTruongImageSrcSync(
      (r.avatar_id as string | null) ?? null,
      ORG_AVATAR_VARIANTS,
    );

    return {
      typeLabel: "Trường đại học",
      title: ten,
      subtitle,
      summary: truncate(r.mo_ta as string | null, 175),
      code: embed?.ma_truong?.trim() || null,
      codeLabel: "Mã trường",
      location: formatTinhThanh(r.tinh_thanh as string | null),
      coverUrl,
      avatarUrl,
      pathPrefix: "co-so-dao-tao",
      tagline: "Trường đào tạo ngành sáng tạo",
    };
  } catch {
    return null;
  }
}
