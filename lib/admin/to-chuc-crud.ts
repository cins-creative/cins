import "server-only";

import {
  isOrgSlugTakenByOther,
  validateOrgSlug,
} from "@/lib/cong-dong/org-slug";
import { mapRow } from "@/lib/admin/to-chuc-list";
import type {
  AdminToChucDetail,
  AdminToChucListRow,
  AdminToChucUpdateInput,
} from "@/lib/admin/to-chuc-types";
import { MO_TA_SHORT_MAX } from "@/lib/truong/mo-ta-short";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const TIN_CAY_SET = new Set([
  "binh_thuong",
  "dang_review",
  "bi_canh_bao",
  "bi_cam",
  "verified_official",
]);

const HOAT_DONG_SET = new Set([
  "dang_hoat_dong",
  "tam_ngung",
  "da_dong_cua",
]);

type DbDetailRow = {
  id: string;
  ten: string;
  slug: string;
  loai_to_chuc: string;
  mo_ta: string | null;
  tinh_thanh: string | null;
  dia_chi: string | null;
  dien_thoai: string | null;
  email_lien_he: string | null;
  trang_thai_tin_cay: string;
  trang_thai_hoat_dong: string;
  avatar_id: string | null;
  org_co_so_dao_tao:
    | { da_verify: boolean }
    | { da_verify: boolean }[]
    | null;
  org_truong_dai_hoc:
    | { da_verify: boolean }
    | { da_verify: boolean }[]
    | null;
};

function mapDetail(row: DbDetailRow): AdminToChucDetail {
  const listRow = mapRow(row);
  return {
    id: row.id,
    ten: row.ten,
    slug: row.slug,
    loai: listRow.loai,
    loaiLabel: listRow.loaiLabel,
    moTa: row.mo_ta?.trim() || null,
    tinhThanh: row.tinh_thanh,
    diaChi: row.dia_chi?.trim() || null,
    dienThoai: row.dien_thoai?.trim() || null,
    emailLienHe: row.email_lien_he?.trim() || null,
    trangThaiTinCay: row.trang_thai_tin_cay,
    trangThaiHoatDong: row.trang_thai_hoat_dong,
  };
}

const DETAIL_SELECT = `id, ten, slug, loai_to_chuc, mo_ta, tinh_thanh, dia_chi, dien_thoai,
  email_lien_he, trang_thai_tin_cay, trang_thai_hoat_dong, avatar_id,
  org_co_so_dao_tao ( da_verify ),
  org_truong_dai_hoc ( da_verify )`;

export async function fetchAdminToChucDetail(
  orgId: string,
): Promise<AdminToChucDetail | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_to_chuc")
    .select(DETAIL_SELECT)
    .eq("id", orgId)
    .maybeSingle<DbDetailRow>();

  if (error || !data) return null;
  return mapDetail(data);
}

export async function updateAdminToChuc(
  orgId: string,
  input: AdminToChucUpdateInput,
): Promise<
  { ok: true; row: AdminToChucListRow } | { ok: false; error: string }
> {
  const patch: Record<string, unknown> = {};

  if (input.ten !== undefined) {
    const ten = input.ten.trim();
    if (!ten) return { ok: false, error: "Tên tổ chức không được trống." };
    if (ten.length > 120) {
      return { ok: false, error: "Tên tổ chức tối đa 120 ký tự." };
    }
    patch.ten = ten;
  }

  if (input.slug !== undefined) {
    const validation = validateOrgSlug(input.slug);
    if (!validation.ok) return { ok: false, error: validation.error };
    if (await isOrgSlugTakenByOther(validation.slug, orgId)) {
      return { ok: false, error: "Đường dẫn này đã có tổ chức khác dùng." };
    }
    patch.slug = validation.slug;
  }

  if (input.moTa !== undefined) {
    const moTa = input.moTa?.trim() || null;
    if (moTa && moTa.length > MO_TA_SHORT_MAX) {
      return {
        ok: false,
        error: `Mô tả ngắn tối đa ${MO_TA_SHORT_MAX} ký tự.`,
      };
    }
    patch.mo_ta = moTa;
  }

  if (input.tinhThanh !== undefined) {
    patch.tinh_thanh = normalizeTinhThanhForDb(input.tinhThanh);
  }

  if (input.diaChi !== undefined) {
    patch.dia_chi = input.diaChi?.trim() || null;
  }

  if (input.dienThoai !== undefined) {
    patch.dien_thoai = input.dienThoai?.trim() || null;
  }

  if (input.emailLienHe !== undefined) {
    patch.email_lien_he = input.emailLienHe?.trim() || null;
  }

  if (input.trangThaiTinCay !== undefined) {
    if (!TIN_CAY_SET.has(input.trangThaiTinCay)) {
      return { ok: false, error: "Trạng thái tin cậy không hợp lệ." };
    }
    patch.trang_thai_tin_cay = input.trangThaiTinCay;
  }

  if (input.trangThaiHoatDong !== undefined) {
    if (!HOAT_DONG_SET.has(input.trangThaiHoatDong)) {
      return { ok: false, error: "Trạng thái hoạt động không hợp lệ." };
    }
    patch.trang_thai_hoat_dong = input.trangThaiHoatDong;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Không có thay đổi." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_to_chuc")
    .update(patch)
    .eq("id", orgId)
    .select(DETAIL_SELECT)
    .maybeSingle<DbDetailRow>();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Không tìm thấy tổ chức." };

  return { ok: true, row: mapRow(data) };
}

/** Soft delete — đặt `trang_thai_hoat_dong = da_dong_cua`. */
export async function archiveAdminToChuc(
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("org_to_chuc")
    .update({ trang_thai_hoat_dong: "da_dong_cua" })
    .eq("id", orgId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
