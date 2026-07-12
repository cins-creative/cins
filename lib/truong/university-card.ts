import type { NganhTruongRow } from "@/lib/nganh/truong-shared";
import type { TruongListItem } from "@/lib/truong/types";

/** Dữ liệu tối thiểu cho card trường (listing + trang ngành). */
export type TruongUniversityCardSchool = Pick<
  TruongListItem,
  | "slug"
  | "ten"
  | "ma_truong"
  | "loai_truong"
  | "org_loai"
  | "logo_id"
  | "avatar_id"
  | "cover_id"
  | "cover_src"
  | "avatar_src"
  | "tinh_thanh"
  | "viewerVaiTro"
  | "viewerDangTheoDoi"
> & {
  ten_tieng_anh?: string | null;
  /** Chi nhánh / cơ sở — chỉ dùng ở variant listing (đếm số chi nhánh). */
  chi_nhanh?: TruongListItem["chi_nhanh"];
};

export type TruongUniversityCardFoot = {
  value: string | number;
  unit?: string;
  label: string;
};

export type TruongUniversityCardTag =
  | string
  | { label: string; muted?: boolean };

export function buildTruongUniversityCardTags(
  nganhTags: string[],
  nganhCount: number,
): TruongUniversityCardTag[] {
  const extra =
    nganhCount > nganhTags.length ? nganhCount - nganhTags.length : 0;
  return [
    ...nganhTags.map((label) => ({ label })),
    ...(extra > 0 ? [{ label: `+${extra}`, muted: true }] : []),
    ...(nganhCount === 0 ? [{ label: "Đang cập nhật", muted: true }] : []),
  ];
}

export function buildTruongUniversityCardFoot(
  nganhCount: number,
): TruongUniversityCardFoot {
  return {
    value: nganhCount,
    unit: "ngành",
    label: "Đang tuyển",
  };
}

export function nganhTruongRowToCardSchool(
  row: NganhTruongRow,
): TruongUniversityCardSchool {
  return {
    slug: row.slug,
    ten: row.ten,
    ma_truong: row.ma_truong,
    loai_truong: row.loai_truong,
    logo_id: row.logo_id?.trim() || null,
    avatar_id: row.avatar_id?.trim() || row.logo_id?.trim() || null,
    cover_id: row.cover_id?.trim() || null,
    avatar_src: row.avatar_src ?? null,
    cover_src: row.cover_src ?? null,
    tinh_thanh: row.tinh_thanh ?? null,
  };
}
