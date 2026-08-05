import "server-only";

import { ensureBatDauHocMilestone } from "@/lib/co-so/bat-dau-hoc-milestone";
import { bumpDonHocPhiChatMessage, sendPhongLopInviteAfterConfirm } from "@/lib/co-so/don-hoc-phi-chat";
import {
  computeNextKyRange,
  type KyHocInterval,
  todayYmdVn,
} from "@/lib/co-so/ky-hoc";
import { ensureLopChatPhongAndJoinStudent } from "@/lib/co-so/lop-chat-phong";
import { ghiPhiDongKhiXacNhanDon } from "@/lib/co-so/phi";
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

  // Ổ KHÓA: flip trạng thái đơn TRƯỚC, điều kiện nằm trong chính lệnh UPDATE
  // (theo mẫu completeDonHang/cancelDonHang trong lib/shop/don-hang.ts). Chỉ tiến
  // trình đổi đúng 1 dòng `cho_thanh_toan` → `da_nhan_tien` mới được đi tiếp tạo
  // kỳ học. Double-click / retry / đua → mảng rỗng → dừng, không tạo kỳ học lặp.
  const nowIso = new Date().toISOString();
  const { data: lockedRows, error: lockErr } = await admin
    .from("org_don_hoc_phi")
    .update({
      trang_thai: "da_nhan_tien",
      xac_nhan_luc: nowIso,
      id_nguoi_thu: input.actorId,
      cap_nhat_luc: nowIso,
    })
    .eq("id", don.id)
    .eq("trang_thai", "cho_thanh_toan")
    .select("id");

  if (lockErr) {
    return { ok: false, error: lockErr.message };
  }
  if (!lockedRows || lockedRows.length === 0) {
    return { ok: false, error: "Đơn đã được xác nhận trước đó." };
  }

  // Phí nền tảng CSĐT — snapshot sau ổ khóa (idempotent theo id đơn).
  // Không chặn xác nhận HV nếu ghi phí lỗi; log để đối soát.
  const phiResult = await ghiPhiDongKhiXacNhanDon({
    donId: don.id,
    orgId: don.id_to_chuc,
    doanhThuVnd: Number(don.so_tien_vnd) || 0,
    xacNhanLuc: nowIso,
  });
  if (!phiResult.ok) {
    console.error("[hoc-phi] ghiPhiDongKhiXacNhanDon failed", {
      donId: don.id,
      error: phiResult.error,
    });
  }

  const { data: hvl, error: hvlErr } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_nguoi_dung, id_khoa_hoc, id_lop_hoc, trang_thai")
    .eq("id", don.id_hoc_vien_lop)
    .maybeSingle<HvlRow>();

  if (hvlErr || !hvl) {
    // Đã thắng ổ khóa (đơn đã flip) nhưng không đọc được ghi danh. Không tự
    // rollback trạng thái đơn — log đủ để tra tay.
    console.error(
      "[hoc-phi] xacNhanDonHocPhi: đã flip đơn nhưng không tìm thấy ghi danh",
      {
        donId: don.id,
        hocVienLopId: don.id_hoc_vien_lop,
        error: hvlErr?.message ?? null,
      },
    );
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
    // Đã flip đơn nhưng tạo kỳ học lỗi. Không tự rollback — log đủ để tra tay.
    console.error(
      "[hoc-phi] xacNhanDonHocPhi: đã flip đơn nhưng tạo kỳ học lỗi",
      { donId: don.id, hocVienLopId: hvl.id, error: kyErr?.message ?? null },
    );
    return { ok: false, error: kyErr?.message ?? "Không tạo được kỳ học." };
  }

  if (hvl.trang_thai !== "dang_hoc") {
    const { error: hvlUpdErr } = await admin
      .from("user_hoc_vien_lop")
      .update({ trang_thai: "dang_hoc" })
      .eq("id", hvl.id);
    if (hvlUpdErr) {
      // Đơn đã flip + kỳ học đã tạo; cập nhật trạng thái ghi danh lỗi → log,
      // không nuốt lỗi, không rollback. Các bước sau vẫn chạy như luồng cũ.
      console.error(
        "[hoc-phi] xacNhanDonHocPhi: cập nhật trạng thái ghi danh lỗi",
        { donId: don.id, hocVienLopId: hvl.id, error: hvlUpdErr.message },
      );
    }
  }

  let joinedPhong = false;
  let lopRoomId: string | null = null;
  if (hvl.id_lop_hoc) {
    const join = await ensureLopChatPhongAndJoinStudent({
      orgId: don.id_to_chuc,
      lopId: hvl.id_lop_hoc,
      studentUserId: hvl.id_nguoi_dung,
      sendWelcome: existing.length === 0,
    });
    joinedPhong = join.ok && join.joined;
    lopRoomId = join.ok ? join.roomId : null;
  }

  // HV dang_hoc → vào hub chat cơ sở (không chặn request chính nếu lỗi tạm).
  await import("@/lib/co-so/org-hub-phong")
    .then(({ syncUserOrgHubMembership }) =>
      syncUserOrgHubMembership(don.id_to_chuc, hvl.id_nguoi_dung),
    )
    .catch(() => undefined);

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

  if (hvl.id_lop_hoc && lopRoomId) {
    await sendPhongLopInviteAfterConfirm({
      donId: don.id,
      actorId: input.actorId,
      orgId: don.id_to_chuc,
      studentUserId: hvl.id_nguoi_dung,
      lopId: hvl.id_lop_hoc,
      lopRoomId,
    }).catch((err) => {
      console.error("[hoc-phi] sendPhongLopInviteAfterConfirm failed", {
        donId: don.id,
        lopRoomId,
        error: err instanceof Error ? err.message : err,
      });
    });
  }

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
      gia_goc_vnd: input.soTienVnd,
      giam_vnd: 0,
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
