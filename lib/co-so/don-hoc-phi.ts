import "server-only";

import { ensureBatDauHocMilestone } from "@/lib/co-so/bat-dau-hoc-milestone";
import { bumpDonHocPhiChatMessage } from "@/lib/co-so/don-hoc-phi-chat";
import {
  computeNextKyRange,
  type KyHocInterval,
  todayYmdVn,
} from "@/lib/co-so/ky-hoc";
import { ensureLopChatPhongAndJoinStudent } from "@/lib/co-so/lop-chat-phong";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type KenhThuHp = "vietqr" | "tien_mat" | "ck_thu_cong";

export type XacNhanDonHocPhiInput = {
  donId: string;
  actorId: string;
};

export type XacNhanDonHocPhiResult =
  | {
      ok: true;
      kyId: string;
      ngayDau: string;
      ngayCuoi: string;
      joinedPhong: boolean;
    }
  | { ok: false; error: string };

type DonRow = {
  id: string;
  id_to_chuc: string;
  id_hoc_vien_lop: string;
  trang_thai: string;
  so_ngay_cong: number;
};

type HvlRow = {
  id: string;
  id_nguoi_dung: string;
  id_khoa_hoc: string;
  id_lop_hoc: string | null;
  trang_thai: string;
};

/**
 * Chốt đơn đã nhận tiền → tạo `org_ky_hoc`, cập nhật enrollment,
 * join phòng lớp (lần đầu), cột mốc Journey «bắt đầu học».
 */
export async function xacNhanDonHocPhi(
  input: XacNhanDonHocPhiInput,
): Promise<XacNhanDonHocPhiResult> {
  const admin = createServiceRoleClient();

  const { data: don, error: donErr } = await admin
    .from("org_don_hoc_phi")
    .select(
      "id, id_to_chuc, id_hoc_vien_lop, trang_thai, so_ngay_cong, so_tien_vnd, ma_don",
    )
    .eq("id", input.donId)
    .maybeSingle<DonRow & { so_tien_vnd: number; ma_don: string | null }>();

  if (donErr || !don) {
    return { ok: false, error: donErr?.message ?? "Không tìm thấy đơn học phí." };
  }
  if (don.trang_thai === "da_nhan_tien") {
    return { ok: false, error: "Đơn đã được xác nhận trước đó." };
  }
  if (don.trang_thai === "huy") {
    return { ok: false, error: "Đơn đã hủy." };
  }

  const { data: hvl, error: hvlErr } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_nguoi_dung, id_khoa_hoc, id_lop_hoc, trang_thai")
    .eq("id", don.id_hoc_vien_lop)
    .maybeSingle<HvlRow>();

  if (hvlErr || !hvl) {
    return { ok: false, error: hvlErr?.message ?? "Không tìm thấy ghi danh." };
  }

  const { data: kyRows } = await admin
    .from("org_ky_hoc")
    .select("id, ngay_dau, ngay_cuoi")
    .eq("id_hoc_vien_lop", hvl.id);

  const existing: KyHocInterval[] = (kyRows ?? []).map((r) => ({
    id: r.id as string,
    ngayDau: r.ngay_dau as string,
    ngayCuoi: r.ngay_cuoi as string,
  }));

  const range = computeNextKyRange(existing, don.so_ngay_cong, todayYmdVn());

  const { data: ky, error: kyErr } = await admin
    .from("org_ky_hoc")
    .insert({
      id_hoc_vien_lop: hvl.id,
      id_don: don.id,
      ngay_dau: range.ngayDau,
      ngay_cuoi: range.ngayCuoi,
    })
    .select("id")
    .single<{ id: string }>();

  if (kyErr || !ky) {
    return { ok: false, error: kyErr?.message ?? "Không tạo được kỳ học." };
  }

  const nowIso = new Date().toISOString();
  await admin
    .from("org_don_hoc_phi")
    .update({
      trang_thai: "da_nhan_tien",
      xac_nhan_luc: nowIso,
      id_nguoi_thu: input.actorId,
      cap_nhat_luc: nowIso,
    })
    .eq("id", don.id);

  if (hvl.trang_thai === "da_dang_ky" || hvl.trang_thai === "tam_nghi") {
    await admin
      .from("user_hoc_vien_lop")
      .update({ trang_thai: "dang_hoc" })
      .eq("id", hvl.id);
  }

  let joinedPhong = false;
  if (hvl.id_lop_hoc) {
    const join = await ensureLopChatPhongAndJoinStudent({
      orgId: don.id_to_chuc,
      lopId: hvl.id_lop_hoc,
      studentUserId: hvl.id_nguoi_dung,
      sendWelcome: existing.length === 0,
    });
    joinedPhong = join.ok && join.joined;
  }

  const [{ data: org }, { data: khoa }] = await Promise.all([
    admin
      .from("org_to_chuc")
      .select("slug, ten, cau_hinh")
      .eq("id", don.id_to_chuc)
      .maybeSingle(),
    admin
      .from("org_khoa_hoc")
      .select("ten_khoa_hoc")
      .eq("id", hvl.id_khoa_hoc)
      .maybeSingle(),
  ]);

  if (org?.slug && org.ten && khoa?.ten_khoa_hoc) {
    await ensureBatDauHocMilestone({
      userId: hvl.id_nguoi_dung,
      orgId: don.id_to_chuc,
      orgTen: org.ten as string,
      orgSlug: org.slug as string,
      khoaId: hvl.id_khoa_hoc,
      tenKhoa: khoa.ten_khoa_hoc as string,
      lopId: hvl.id_lop_hoc,
    });
  }

  await bumpDonHocPhiChatMessage({
    id: don.id,
    maDon: don.ma_don,
    soTienVnd: Number(don.so_tien_vnd) || 0,
    soNgayCong: don.so_ngay_cong,
    trangThai: "da_nhan_tien",
    tenKhoa: (khoa?.ten_khoa_hoc as string | null) ?? null,
  });

  return {
    ok: true,
    kyId: ky.id,
    ngayDau: range.ngayDau,
    ngayCuoi: range.ngayCuoi,
    joinedPhong,
  };
}

export async function createDonTienMat(input: {
  orgId: string;
  hocVienLopId: string;
  soNgayCong: number;
  soTienVnd: number;
  actorId: string;
  goiId?: string | null;
  chiNhanhId?: string | null;
  ghiChu?: string | null;
  autoConfirm?: boolean;
}): Promise<
  | { ok: true; donId: string; confirmed: boolean }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  if (input.soNgayCong < 1) {
    return { ok: false, error: "Số ngày cộng phải ≥ 1." };
  }

  const { data: don, error } = await admin
    .from("org_don_hoc_phi")
    .insert({
      id_to_chuc: input.orgId,
      id_hoc_vien_lop: input.hocVienLopId,
      id_goi: input.goiId ?? null,
      id_chi_nhanh: input.chiNhanhId ?? null,
      id_nguoi_thu: input.actorId,
      kenh: "tien_mat" satisfies KenhThuHp,
      trang_thai: "cho_thanh_toan",
      so_tien_vnd: input.soTienVnd,
      so_ngay_cong: input.soNgayCong,
      ghi_chu: input.ghiChu ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !don) {
    return { ok: false, error: error?.message ?? "Không tạo được đơn." };
  }

  if (input.autoConfirm !== false) {
    const conf = await xacNhanDonHocPhi({
      donId: don.id,
      actorId: input.actorId,
    });
    if (!conf.ok) return conf;
    return { ok: true, donId: don.id, confirmed: true };
  }

  return { ok: true, donId: don.id, confirmed: false };
}
