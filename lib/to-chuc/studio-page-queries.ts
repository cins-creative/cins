import "server-only";

import { cache } from "react";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

export type StudioPagePayload = {
  id: string;
  slug: string;
  ten: string;
  moTa: string | null;
  gioiThieu: string | null;
  tenChinhThuc: string | null;
  website: string | null;
  tinhThanh: string | null;
  diaChi: string | null;
  dienThoai: string | null;
  emailLienHe: string | null;
  avatarSrc: string | null;
  coverSrc: string | null;
};

async function loadStudioBySlug(
  slug: string,
): Promise<StudioPagePayload | null> {
  const cleaned = slug?.trim();
  if (!cleaned) return null;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_to_chuc")
    .select(
      "id, slug, ten, mo_ta, gioi_thieu_truong, tinh_thanh, dia_chi, dien_thoai, email_lien_he, avatar_id, cover_id, loai_to_chuc, cau_hinh",
    )
    .eq("slug", cleaned)
    .in("loai_to_chuc", ["studio", "doanh_nghiep"])
    .maybeSingle<{
      id: string;
      slug: string;
      ten: string;
      mo_ta: string | null;
      gioi_thieu_truong: string | null;
      tinh_thanh: string | null;
      dia_chi: string | null;
      dien_thoai: string | null;
      email_lien_he: string | null;
      avatar_id: string | null;
      cover_id: string | null;
      loai_to_chuc: string;
      cau_hinh: Record<string, unknown> | null;
    }>();

  if (error || !data) return null;

  const cauHinh = data.cau_hinh ?? {};
  const website =
    typeof cauHinh.website === "string" ? (cauHinh.website as string) : null;
  const tenChinhThuc =
    typeof cauHinh.ten_chinh_thuc === "string"
      ? (cauHinh.ten_chinh_thuc as string)
      : null;

  return {
    id: data.id,
    slug: data.slug,
    ten: data.ten,
    moTa: data.mo_ta,
    gioiThieu: data.gioi_thieu_truong,
    tenChinhThuc,
    website,
    tinhThanh: data.tinh_thanh,
    diaChi: data.dia_chi,
    dienThoai: data.dien_thoai,
    emailLienHe: data.email_lien_he,
    avatarSrc: resolveTruongImageSrcSync(data.avatar_id, [
      "public",
      "avatar",
      "medium",
    ]),
    coverSrc: resolveTruongImageSrcSync(data.cover_id, [
      "public",
      "cover",
      "medium",
    ]),
  };
}

export const getStudioBySlugCached = cache(loadStudioBySlug);
