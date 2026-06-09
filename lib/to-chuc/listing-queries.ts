import "server-only";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import type { TruongListItem } from "@/lib/truong/types";

type CoSoEmbed = {
  ma_co_so?: string | null;
  loai_co_so?: string | null;
  website?: string | null;
  ten_chinh_thuc?: string | null;
  nam_thanh_lap?: number | null;
};

type RawOrg = {
  id?: string;
  slug?: string | null;
  ten?: string | null;
  logo_id?: string | null;
  avatar_id?: string | null;
  cover_id?: string | null;
  mo_ta?: string | null;
  gioi_thieu_truong?: string | null;
  tinh_thanh?: string | null;
  dia_chi?: string | null;
  dien_thoai?: string | null;
  email_lien_he?: string | null;
  org_co_so_dao_tao?: CoSoEmbed | CoSoEmbed[] | null;
};

function pickOne<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

function enrichMedia(item: TruongListItem): TruongListItem {
  const avatarImageId = item.avatar_id ?? item.logo_id;
  const avatar_src = avatarImageId
    ? resolveTruongImageSrcSync(avatarImageId, ["public", "avatar"])
    : null;
  const cover_src = item.cover_id
    ? resolveTruongImageSrcSync(item.cover_id, ["public", "cover", "medium"])
    : null;
  return {
    ...item,
    avatar_src: avatar_src ?? null,
    cover_src: cover_src ?? null,
  };
}

/** Cơ sở đào tạo user/CINS tạo — hiển thị trên hub `/truong-dai-hoc`. */
export async function listCoSoDaoTaoForListing(): Promise<TruongListItem[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("org_to_chuc")
      .select(
        `
        id,
        slug,
        ten,
        logo_id,
        avatar_id,
        cover_id,
        mo_ta,
        gioi_thieu_truong,
        tinh_thanh,
        dia_chi,
        dien_thoai,
        email_lien_he,
        org_co_so_dao_tao!inner (
          ma_co_so,
          loai_co_so,
          website,
          ten_chinh_thuc,
          nam_thanh_lap
        )
      `,
      )
      .eq("loai_to_chuc", "co_so_dao_tao");

    if (error || !data?.length) return [];

    const items: TruongListItem[] = [];
    for (const row of data as RawOrg[]) {
      const ext = pickOne(row.org_co_so_dao_tao);
      const id = row.id?.trim();
      const slug = row.slug?.trim();
      const ten = row.ten?.trim();
      if (!ext || !id || !slug || !ten) continue;

      items.push(
        enrichMedia({
          id,
          slug,
          ten,
          org_loai: "co_so_dao_tao",
          logo_id: row.logo_id ?? null,
          avatar_id: row.avatar_id ?? row.logo_id ?? null,
          cover_id: row.cover_id ?? null,
          mo_ta: row.mo_ta?.trim() || null,
          gioi_thieu_truong: row.gioi_thieu_truong?.trim() || null,
          tinh_thanh: row.tinh_thanh?.trim() || null,
          dia_chi: row.dia_chi?.trim() || null,
          dien_thoai: row.dien_thoai?.trim() || null,
          email_lien_he: row.email_lien_he?.trim() || null,
          ma_truong: ext.ma_co_so?.trim() || null,
          loai_truong: ext.loai_co_so?.trim() || null,
          website: ext.website?.trim() || null,
          ten_chinh_thuc: ext.ten_chinh_thuc?.trim() || ten,
          ten_tieng_anh: null,
          nam_thanh_lap:
            typeof ext.nam_thanh_lap === "number" ? ext.nam_thanh_lap : null,
          hoc_phi_nam_tu: null,
          hoc_phi_nam_den: null,
          co_ktx: null,
          ktx_gia_thang: null,
          nganhCount: 0,
          nganhTags: [],
        }),
      );
    }

    return items.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  } catch {
    return [];
  }
}
