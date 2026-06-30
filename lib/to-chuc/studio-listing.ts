import "server-only";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

export type StudioLoai = "studio" | "doanh_nghiep";

export type StudioListItem = {
  id: string;
  slug: string;
  ten: string;
  moTa: string | null;
  tinhThanh: string | null;
  tenChinhThuc: string | null;
  website: string | null;
  loaiToChuc: StudioLoai;
  avatarSrc: string | null;
  coverSrc: string | null;
};

type RawStudio = {
  id?: string;
  slug?: string | null;
  ten?: string | null;
  mo_ta?: string | null;
  tinh_thanh?: string | null;
  avatar_id?: string | null;
  cover_id?: string | null;
  loai_to_chuc?: string | null;
  cau_hinh?: Record<string, unknown> | null;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Studio / doanh nghiệp user/CINs tạo — hiển thị trên hub `/studio`. */
export async function listStudiosForListing(): Promise<StudioListItem[]> {
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
        mo_ta,
        tinh_thanh,
        avatar_id,
        cover_id,
        loai_to_chuc,
        cau_hinh
      `,
      )
      .in("loai_to_chuc", ["studio", "doanh_nghiep"]);

    if (error || !data?.length) return [];

    const items: StudioListItem[] = [];
    for (const row of data as RawStudio[]) {
      const id = row.id?.trim();
      const slug = row.slug?.trim();
      const ten = row.ten?.trim();
      if (!id || !slug || !ten) continue;

      const cauHinh = row.cau_hinh ?? {};
      const loaiToChuc: StudioLoai =
        row.loai_to_chuc === "doanh_nghiep" ? "doanh_nghiep" : "studio";

      items.push({
        id,
        slug,
        ten,
        moTa: readString(row.mo_ta),
        tinhThanh: readString(row.tinh_thanh),
        tenChinhThuc: readString(cauHinh.ten_chinh_thuc),
        website: readString(cauHinh.website),
        loaiToChuc,
        avatarSrc: row.avatar_id
          ? resolveTruongImageSrcSync(row.avatar_id, ["public", "avatar"])
          : null,
        coverSrc: row.cover_id
          ? resolveTruongImageSrcSync(row.cover_id, ["public", "cover", "medium"])
          : null,
      });
    }

    return items.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  } catch {
    return [];
  }
}
