import "server-only";

import { formatTinhThanh } from "@/lib/journey/profile";
import { labelLoaiCoSo } from "@/lib/to-chuc/constants";
import type { OrgOgContext } from "@/lib/og/org-og-card";
import {
  ORG_AVATAR_VARIANTS,
  ORG_COVER_VARIANTS,
} from "@/lib/truong/org-image-variants";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const CO_SO_OG_SELECT =
  "id, slug, ten, mo_ta, avatar_id, cover_id, tinh_thanh, org_co_so_dao_tao(ma_co_so, ten_chinh_thuc, loai_co_so)";

type CoSoEmbed = {
  ma_co_so?: string | null;
  ten_chinh_thuc?: string | null;
  loai_co_so?: string | null;
};

function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function pickEmbed(raw: unknown): CoSoEmbed | null {
  if (Array.isArray(raw)) return (raw[0] as CoSoEmbed) ?? null;
  if (raw && typeof raw === "object") return raw as CoSoEmbed;
  return null;
}

/** OG context cho trang cơ sở đào tạo (`/co-so/[slug]`). */
export async function fetchCoSoOgContext(
  slug: string,
): Promise<OrgOgContext | null> {
  if (!hasSupabaseEnv()) return null;
  const slugNorm = slug.trim();
  if (!slugNorm) return null;
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("org_to_chuc")
      .select(CO_SO_OG_SELECT)
      .eq("slug", slugNorm)
      .eq("loai_to_chuc", "co_so_dao_tao")
      .maybeSingle();
    if (error || !data) return null;

    const r = data as Record<string, unknown>;
    const ten = String(r.ten ?? "").trim();
    if (!ten) return null;

    const embed = pickEmbed(r.org_co_so_dao_tao);
    const tenChinhThuc = embed?.ten_chinh_thuc?.trim() || null;
    const subtitle =
      tenChinhThuc && tenChinhThuc.toLowerCase() !== ten.toLowerCase()
        ? tenChinhThuc
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
      typeLabel: labelLoaiCoSo(embed?.loai_co_so) || "Cơ sở đào tạo",
      title: ten,
      subtitle,
      summary: truncate(r.mo_ta as string | null, 175),
      code: embed?.ma_co_so?.trim() || null,
      codeLabel: "Mã cơ sở",
      location: formatTinhThanh(r.tinh_thanh as string | null),
      coverUrl,
      avatarUrl,
      pathPrefix: "co-so",
      tagline: "Cơ sở đào tạo ngành sáng tạo",
    };
  } catch {
    return null;
  }
}
