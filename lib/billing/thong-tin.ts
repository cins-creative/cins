import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { canSuaTk, findAccessibleTkForUser, mapDichVu, mapTk } from "./tk";
import type { CinsDichVu, CinsTkThanhToan } from "./types";

const DV_SELECT =
  "id, id_tk, loai, tham_chieu_id, ty_le, nguong_chot_vnd, toi_thieu_xuat_ky_vnd, so_ngay_han_tra, da_dung_chay_thu, trang_thai, hd_ten_phap_nhan, hd_mst, hd_dia_chi, hd_email";

const TK_SELECT =
  "id, id_nguoi_dung, ten_phap_nhan, mst, dia_chi, email_hoa_don, han_muc_vnd, trang_thai, ly_do_khoa_tu_dong, ly_do_khoa_thu_cong, no_da_xoa_vnd, tao_luc, cap_nhat_luc";

/**
 * Actor được sửa billing của kỳ org? (tk chứa dòng csdt_phi của org).
 */
export async function assertCanSuaOrgPhiKy(input: {
  actorId: string;
  orgId: string;
  kyId: string;
}): Promise<
  | { ok: true; tkId: string }
  | { ok: false; error: string; status: 403 | 404 }
> {
  const admin = createServiceRoleClient();
  const { data: ky } = await admin
    .from("org_phi_ky")
    .select("id, id_to_chuc")
    .eq("id", input.kyId)
    .eq("id_to_chuc", input.orgId)
    .maybeSingle<{ id: string; id_to_chuc: string }>();
  if (!ky) return { ok: false, error: "Không tìm thấy kỳ.", status: 404 };

  const { data: dv } = await admin
    .from("cins_dich_vu")
    .select("id, id_tk")
    .eq("loai", "csdt_phi")
    .eq("tham_chieu_id", input.orgId)
    .maybeSingle<{ id: string; id_tk: string }>();
  if (!dv) {
    return {
      ok: false,
      error: "Chưa có dòng dịch vụ billing cho cơ sở này.",
      status: 404,
    };
  }
  if (!(await canSuaTk(dv.id_tk, input.actorId))) {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  return { ok: true, tkId: dv.id_tk };
}

export async function updateTkThongTinHoaDon(input: {
  actorId: string;
  tenPhapNhan?: string | null;
  mst?: string | null;
  diaChi?: string | null;
  emailHoaDon?: string | null;
}): Promise<
  { ok: true; tk: CinsTkThanhToan } | { ok: false; error: string; status: number }
> {
  const access = await findAccessibleTkForUser(input.actorId);
  if (!access) {
    return { ok: false, error: "Chưa có tài khoản thanh toán.", status: 404 };
  }
  if (!(await canSuaTk(access.tk.id, input.actorId))) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (input.tenPhapNhan !== undefined) {
    patch.ten_phap_nhan = cleanText(input.tenPhapNhan, 200);
  }
  if (input.mst !== undefined) {
    patch.mst = cleanText(input.mst, 32);
  }
  if (input.diaChi !== undefined) {
    patch.dia_chi = cleanText(input.diaChi, 500);
  }
  if (input.emailHoaDon !== undefined) {
    const email = cleanText(input.emailHoaDon, 200);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Email hoá đơn không hợp lệ.", status: 400 };
    }
    patch.email_hoa_don = email;
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_tk_thanh_toan")
    .update(patch)
    .eq("id", access.tk.id)
    .select(TK_SELECT)
    .single();
  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Không lưu được.",
      status: 500,
    };
  }
  return { ok: true, tk: mapTk(data) };
}

export async function updateDichVuThongTinHd(input: {
  actorId: string;
  dichVuId: string;
  hdTenPhapNhan?: string | null;
  hdMst?: string | null;
  hdDiaChi?: string | null;
  hdEmail?: string | null;
}): Promise<
  { ok: true; dichVu: CinsDichVu } | { ok: false; error: string; status: number }
> {
  const admin = createServiceRoleClient();
  const { data: dv } = await admin
    .from("cins_dich_vu")
    .select(DV_SELECT)
    .eq("id", input.dichVuId)
    .maybeSingle();
  if (!dv) {
    return { ok: false, error: "Không tìm thấy dòng dịch vụ.", status: 404 };
  }
  if (!(await canSuaTk(dv.id_tk as string, input.actorId))) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (input.hdTenPhapNhan !== undefined) {
    patch.hd_ten_phap_nhan = cleanText(input.hdTenPhapNhan, 200);
  }
  if (input.hdMst !== undefined) {
    patch.hd_mst = cleanText(input.hdMst, 32);
  }
  if (input.hdDiaChi !== undefined) {
    patch.hd_dia_chi = cleanText(input.hdDiaChi, 500);
  }
  if (input.hdEmail !== undefined) {
    const email = cleanText(input.hdEmail, 200);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Email hoá đơn không hợp lệ.", status: 400 };
    }
    patch.hd_email = email;
  }

  const { data, error } = await admin
    .from("cins_dich_vu")
    .update(patch)
    .eq("id", input.dichVuId)
    .select(DV_SELECT)
    .single();
  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Không lưu được.",
      status: 500,
    };
  }
  return { ok: true, dichVu: mapDichVu(data) };
}

function cleanText(v: string | null | undefined, max: number): string | null {
  if (v == null) return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}
