import "server-only";

import { cache } from "react";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import {
  ORG_AVATAR_VARIANTS,
  ORG_COVER_VARIANTS,
} from "@/lib/truong/org-image-variants";
import { fetchBaiDang, fetchHinhAnh } from "@/lib/truong/queries";
import type { TruongBaiDang, TruongHinhAnh } from "@/lib/truong/types";
import {
  isStudioTabVisible,
  parseStudioPageCauHinh,
  STUDIO_SHOWCASE_LOAI,
  type StudioPageCauHinh,
} from "@/lib/to-chuc/studio-page-config";
import {
  normalizeStudioHoatDong,
  type StudioHoatDongStatus,
} from "@/lib/to-chuc/studio-lifecycle.shared";

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
    avatarSrc: resolveTruongImageSrcSync(data.avatar_id, ORG_AVATAR_VARIANTS),
    coverSrc: resolveTruongImageSrcSync(data.cover_id, ORG_COVER_VARIANTS),
  };
}

export const getStudioBySlugCached = cache(loadStudioBySlug);

/** Owner object đủ field cho cover/avatar/timeline/sidebar studio. */
export type StudioOwner = {
  id: string;
  slug: string;
  ten: string;
  loaiToChuc: string;
  avatar_id: string | null;
  logo_id: string | null;
  avatar_src: string | null;
  cover_id: string | null;
  cover_src: string | null;
  moTa: string | null;
  gioiThieu: string | null;
  tenChinhThuc: string | null;
  website: string | null;
  tinhThanh: string | null;
  diaChi: string | null;
  dienThoai: string | null;
  emailLienHe: string | null;
  trangThaiHoatDong: StudioHoatDongStatus;
};

export type StudioDetailPayload = {
  studio: StudioOwner;
  /** Mọi bài đăng studio (kể cả thẻ showcase) — nguồn tab Bài đăng. */
  baidang: TruongBaiDang[];
  /** Subset gắn `loai_bai_dang = showcase` — lens tab Showcase. */
  showcase: TruongBaiDang[];
  hinhanh: TruongHinhAnh[];
  /** `org_to_chuc.cau_hinh.tabs` — ẩn/hiện tab tùy chọn (vd. Hình ảnh). */
  pageConfig: StudioPageCauHinh;
};

async function loadStudioDetailPayload(
  slug: string,
): Promise<StudioDetailPayload | null> {
  const cleaned = slug?.trim();
  if (!cleaned || !hasSupabaseEnv()) return null;

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("org_to_chuc")
    .select(
      "id, slug, ten, mo_ta, gioi_thieu_truong, tinh_thanh, dia_chi, dien_thoai, email_lien_he, avatar_id, cover_id, loai_to_chuc, cau_hinh, trang_thai_hoat_dong",
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
      trang_thai_hoat_dong: string | null;
    }>();

  if (error || !data) return null;

  const cauHinh = data.cau_hinh ?? {};
  const pageConfig = parseStudioPageCauHinh(cauHinh);
  const website =
    typeof cauHinh.website === "string" ? (cauHinh.website as string) : null;
  const tenChinhThuc =
    typeof cauHinh.ten_chinh_thuc === "string"
      ? (cauHinh.ten_chinh_thuc as string)
      : null;

  const studio: StudioOwner = {
    id: data.id,
    slug: data.slug,
    ten: data.ten,
    loaiToChuc: data.loai_to_chuc,
    avatar_id: data.avatar_id,
    logo_id: null,
    avatar_src: data.avatar_id?.trim()
      ? resolveTruongImageSrcSync(data.avatar_id, ORG_AVATAR_VARIANTS)
      : null,
    cover_id: data.cover_id,
    cover_src: data.cover_id?.trim()
      ? resolveTruongImageSrcSync(data.cover_id, ORG_COVER_VARIANTS)
      : null,
    moTa: data.mo_ta,
    gioiThieu: data.gioi_thieu_truong,
    tenChinhThuc,
    website,
    tinhThanh: data.tinh_thanh,
    diaChi: data.dia_chi,
    dienThoai: data.dien_thoai,
    emailLienHe: data.email_lien_he,
    trangThaiHoatDong: normalizeStudioHoatDong(data.trang_thai_hoat_dong),
  };

  const showHinhAnh = isStudioTabVisible("hinh-anh", pageConfig);
  const [posts, hinhanh] = await Promise.all([
    fetchBaiDang(supabase, data.id, 40),
    showHinhAnh ? fetchHinhAnh(supabase, data.id) : Promise.resolve([]),
  ]);

  const showcase = posts.filter(
    (p) => p.loai_bai_dang === STUDIO_SHOWCASE_LOAI,
  );
  /* Tab Bài đăng = nguồn chính — giữ cả bài gắn thẻ showcase (không “chuyển” mất). */
  const baidang = posts;

  return { studio, baidang, showcase, hinhanh, pageConfig };
}

export async function getStudioMetaBySlugCached(slug: string) {
  const payload = await getStudioDetailPayloadCached(slug);
  if (!payload) return null;
  return { ten: payload.studio.ten, moTa: payload.studio.moTa };
}

export const getStudioDetailPayloadCached = cache(loadStudioDetailPayload);
