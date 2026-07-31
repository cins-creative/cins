import "server-only";

import { sendRoomMessage } from "@/lib/chat/direct-message";
import { findOrCreateOrgStudentRoom } from "@/lib/chat/org-message";
import type { ChatContextCard } from "@/lib/chat/types";
import { buildVietQrImageUrl } from "@/lib/shop/vietqr";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type DonHocPhiChatSnapshot = {
  id: string;
  maDon: string | null;
  soTienVnd: number;
  soNgayCong: number;
  trangThai: string;
  tenKhoa?: string | null;
  maLop?: string | null;
  nganHang?: string | null;
  soTaiKhoan?: string | null;
  tenChuTk?: string | null;
};

export function donHocPhiToChatContext(
  don: DonHocPhiChatSnapshot,
): ChatContextCard {
  const ma = don.maDon?.trim() || don.id.slice(0, 8).toUpperCase();
  const lines: string[] = [];
  if (don.tenKhoa) lines.push(don.tenKhoa);
  if (don.maLop) lines.push(`Lớp: ${don.maLop}`);
  lines.push(`${don.soNgayCong} ngày học`);
  lines.push(`Tổng: ${don.soTienVnd.toLocaleString("vi-VN")}đ`);
  if (don.trangThai === "da_nhan_tien") {
    lines.push("Tình trạng: Đã nhận tiền");
  } else if (don.trangThai === "cho_thanh_toan") {
    lines.push("Tình trạng: Chờ thanh toán");
  }
  if (don.nganHang && don.soTaiKhoan) {
    lines.push(`NH: ${don.nganHang}`);
    lines.push(`STK: ${don.soTaiKhoan}`);
    if (don.tenChuTk) lines.push(`Chủ TK: ${don.tenChuTk}`);
  }
  lines.push(`Nội dung CK: ${ma}`);

  const qr =
    don.trangThai === "cho_thanh_toan" && don.nganHang && don.soTaiKhoan
      ? buildVietQrImageUrl({
          nganHang: don.nganHang,
          soTaiKhoan: don.soTaiKhoan,
          amountVnd: don.soTienVnd,
          addInfo: ma,
        })
      : null;

  return {
    loai: "don_hoc_phi",
    id: don.id,
    tieuDe: `Học phí ${ma}`,
    moTa: lines.join("\n"),
    anh: qr,
    href: null,
  };
}

export function getOrgThanhToanFromCauHinh(cauHinh: unknown): {
  nganHang: string | null;
  soTaiKhoan: string | null;
  tenChuTk: string | null;
} {
  if (!cauHinh || typeof cauHinh !== "object" || Array.isArray(cauHinh)) {
    return { nganHang: null, soTaiKhoan: null, tenChuTk: null };
  }
  const tt = (cauHinh as Record<string, unknown>).thanh_toan;
  if (!tt || typeof tt !== "object" || Array.isArray(tt)) {
    return { nganHang: null, soTaiKhoan: null, tenChuTk: null };
  }
  const o = tt as Record<string, unknown>;
  return {
    nganHang: typeof o.ngan_hang === "string" ? o.ngan_hang : null,
    soTaiKhoan: typeof o.so_tai_khoan === "string" ? o.so_tai_khoan : null,
    tenChuTk: typeof o.ten_chu_tk === "string" ? o.ten_chu_tk : null,
  };
}

export function mergeThanhToanIntoCauHinh(
  existing: unknown,
  patch: {
    nganHang: string;
    soTaiKhoan: string;
    tenChuTk: string;
  },
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return {
    ...base,
    thanh_toan: {
      ngan_hang: patch.nganHang.trim(),
      so_tai_khoan: patch.soTaiKhoan.trim(),
      ten_chu_tk: patch.tenChuTk.trim(),
    },
  };
}

/** Tạo đơn chờ TT + gửi card vào phòng 1_org với học viên. */
export async function createAndSendDonHocPhiChat(input: {
  orgId: string;
  staffUserId: string;
  hocVienLopId: string;
  soNgayCong: number;
  soTienVnd: number;
  goiId?: string | null;
  ghiChu?: string | null;
  /** HV tự gia hạn — không ghi id_nguoi_thu = HV. */
  selfServe?: boolean;
}): Promise<
  | { ok: true; donId: string; roomId: string }
  | { ok: false; error: string }
> {
  if (input.soNgayCong < 1) {
    return { ok: false, error: "Số ngày phải ≥ 1." };
  }
  const admin = createServiceRoleClient();

  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_nguoi_dung, id_khoa_hoc, id_lop_hoc")
    .eq("id", input.hocVienLopId)
    .maybeSingle();
  if (!hvl) return { ok: false, error: "Không tìm thấy ghi danh." };

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, ten_khoa_hoc, id_to_chuc")
    .eq("id", hvl.id_khoa_hoc as string)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== input.orgId) {
    return { ok: false, error: "Ghi danh không thuộc cơ sở này." };
  }

  let maLop: string | null = null;
  if (hvl.id_lop_hoc) {
    const { data: lop } = await admin
      .from("org_lop_hoc")
      .select("ma_lop")
      .eq("id", hvl.id_lop_hoc as string)
      .maybeSingle();
    maLop = (lop?.ma_lop as string | null) ?? null;
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", input.orgId)
    .maybeSingle();
  const stk = getOrgThanhToanFromCauHinh(org?.cau_hinh);

  const maDon = `HP${Date.now().toString(36).toUpperCase()}`;
  const kenh =
    stk.nganHang && stk.soTaiKhoan ? "vietqr" : "ck_thu_cong";
  const { data: don, error } = await admin
    .from("org_don_hoc_phi")
    .insert({
      id_to_chuc: input.orgId,
      id_hoc_vien_lop: input.hocVienLopId,
      id_goi: input.goiId ?? null,
      id_nguoi_thu: input.selfServe ? null : input.staffUserId,
      ma_don: maDon,
      kenh,
      trang_thai: "cho_thanh_toan",
      so_tien_vnd: input.soTienVnd,
      so_ngay_cong: input.soNgayCong,
      ghi_chu: input.ghiChu ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !don) {
    return { ok: false, error: error?.message ?? "Không tạo đơn." };
  }

  const roomId = await findOrCreateOrgStudentRoom(
    input.orgId,
    hvl.id_nguoi_dung as string,
  );

  // Đảm bảo sender trong phòng (staff = admin; HV self-serve đã là member)
  if (!input.selfServe) {
    const { data: staffMem } = await admin
      .from("chat_thanh_vien")
      .select("id")
      .eq("id_phong", roomId)
      .eq("id_nguoi_dung", input.staffUserId)
      .is("roi_luc", null)
      .maybeSingle();
    if (!staffMem?.id) {
      await admin.from("chat_thanh_vien").insert({
        id_phong: roomId,
        id_nguoi_dung: input.staffUserId,
        vai_tro: "admin",
      });
    }
  }

  const ctx = donHocPhiToChatContext({
    id: don.id,
    maDon,
    soTienVnd: input.soTienVnd,
    soNgayCong: input.soNgayCong,
    trangThai: "cho_thanh_toan",
    tenKhoa: khoa.ten_khoa_hoc as string,
    maLop,
    nganHang: stk.nganHang,
    soTaiKhoan: stk.soTaiKhoan,
    tenChuTk: stk.tenChuTk,
  });

  const sent = await sendRoomMessage(roomId, input.staffUserId, {
    body: ctx.tieuDe,
    nguCanh: ctx,
  });
  if (!sent.ok) {
    return { ok: false, error: sent.error };
  }

  await admin
    .from("org_don_hoc_phi")
    .update({ id_tin_nhan: sent.message.id })
    .eq("id", don.id);

  return { ok: true, donId: don.id, roomId };
}

/** Cập nhật card chat sẵn có sau khi xác nhận / hủy đơn. */
export async function bumpDonHocPhiChatMessage(
  don: DonHocPhiChatSnapshot,
): Promise<void> {
  const admin = createServiceRoleClient();
  const ctx = donHocPhiToChatContext(don);
  const now = new Date().toISOString();

  const { data: byTin } = don.id
    ? await admin
        .from("org_don_hoc_phi")
        .select("id_tin_nhan")
        .eq("id", don.id)
        .maybeSingle<{ id_tin_nhan: string | null }>()
    : { data: null };

  let msgId = byTin?.id_tin_nhan ?? null;
  if (!msgId) {
    const { data: rows } = await admin
      .from("chat_tin_nhan")
      .select("id")
      .eq("da_xoa", false)
      .filter("ngu_canh->>loai", "eq", "don_hoc_phi")
      .filter("ngu_canh->>id", "eq", don.id)
      .order("tao_luc", { ascending: false })
      .limit(1);
    msgId = (rows?.[0]?.id as string | undefined) ?? null;
  }
  if (!msgId) return;

  const { data: msg } = await admin
    .from("chat_tin_nhan")
    .select("id, id_phong, ngu_canh")
    .eq("id", msgId)
    .maybeSingle();
  if (!msg) return;

  const prev =
    msg.ngu_canh && typeof msg.ngu_canh === "object"
      ? (msg.ngu_canh as Record<string, unknown>)
      : null;
  const nextNguCanh: Record<string, unknown> = { ...ctx };
  if (prev && Array.isArray(prev.mentions)) {
    nextNguCanh.mentions = prev.mentions;
  }

  await admin
    .from("chat_tin_nhan")
    .update({
      ngu_canh: nextNguCanh,
      tao_luc: now,
      noi_dung: ctx.tieuDe,
    })
    .eq("id", msg.id);

  await admin
    .from("chat_phong")
    .update({ cap_nhat_luc: now })
    .eq("id", msg.id_phong);
}

/**
 * HV tự tạo đơn gia hạn VietQR từ phòng lớp (freeze CTA).
 * Gửi card vào `1_org`; staff đối soát bằng ma_don + xác nhận.
 */
export async function createGiaHanVietQrForStudent(input: {
  lopRoomId: string;
  studentUserId: string;
  goiId?: string | null;
}): Promise<
  | { ok: true; donId: string; roomId: string; orgId: string; maDon: string }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("id, loai_phong, id_context, id_org_dai_dien")
    .eq("id", input.lopRoomId)
    .maybeSingle();
  if (!room || room.loai_phong !== "lop_hoc") {
    return { ok: false, error: "Không phải phòng lớp." };
  }
  const lopId = room.id_context as string | null;
  const orgId = room.id_org_dai_dien as string | null;
  if (!lopId || !orgId) {
    return { ok: false, error: "Phòng lớp thiếu org/lớp." };
  }

  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id")
    .eq("id_nguoi_dung", input.studentUserId)
    .eq("id_lop_hoc", lopId)
    .maybeSingle();
  if (!hvl?.id) {
    return { ok: false, error: "Bạn không thuộc lớp này." };
  }

  // Chặn spam: đã có đơn chờ trong 24h
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data: pending } = await admin
    .from("org_don_hoc_phi")
    .select("id")
    .eq("id_hoc_vien_lop", hvl.id)
    .eq("trang_thai", "cho_thanh_toan")
    .gte("tao_luc", since)
    .limit(1)
    .maybeSingle();
  if (pending?.id) {
    return {
      ok: false,
      error: "Đã có đơn chờ thanh toán. Mở chat tư vấn để xem QR.",
    };
  }

  let goiId = input.goiId ?? null;
  let soNgay = 30;
  let soTien = 0;
  if (goiId) {
    const { data: goi } = await admin
      .from("org_goi_hoc_phi")
      .select("id, so_ngay, gia_vnd")
      .eq("id", goiId)
      .eq("id_to_chuc", orgId)
      .eq("dang_ban", true)
      .maybeSingle();
    if (goi) {
      soNgay = goi.so_ngay as number;
      soTien = Number(goi.gia_vnd) || 0;
    } else {
      goiId = null;
    }
  }
  if (!goiId) {
    const { data: goi } = await admin
      .from("org_goi_hoc_phi")
      .select("id, so_ngay, gia_vnd")
      .eq("id_to_chuc", orgId)
      .eq("dang_ban", true)
      .order("thu_tu")
      .limit(1)
      .maybeSingle();
    if (goi) {
      goiId = goi.id as string;
      soNgay = goi.so_ngay as number;
      soTien = Number(goi.gia_vnd) || 0;
    }
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", orgId)
    .maybeSingle();
  const stk = getOrgThanhToanFromCauHinh(org?.cau_hinh);
  if (!stk.nganHang || !stk.soTaiKhoan) {
    return {
      ok: false,
      error: "Cơ sở chưa cấu hình STK nhận học phí. Liên hệ tư vấn.",
    };
  }

  const sent = await createAndSendDonHocPhiChat({
    orgId,
    staffUserId: input.studentUserId,
    hocVienLopId: hvl.id as string,
    soNgayCong: soNgay,
    soTienVnd: soTien,
    goiId,
    ghiChu: "Gia hạn VietQR (tự tạo từ phòng lớp)",
    selfServe: true,
  });
  if (!sent.ok) return sent;

  const { data: don } = await admin
    .from("org_don_hoc_phi")
    .select("ma_don")
    .eq("id", sent.donId)
    .maybeSingle();

  return {
    ok: true,
    donId: sent.donId,
    roomId: sent.roomId,
    orgId,
    maDon: (don?.ma_don as string) || sent.donId.slice(0, 8).toUpperCase(),
  };
}

export async function listDonChoThanhToan(orgId: string): Promise<
  Array<{
    id: string;
    maDon: string | null;
    soTienVnd: number;
    soNgayCong: number;
    kenh: string;
    taoLuc: string;
    tenHienThi: string;
    tenKhoa: string;
  }>
> {
  const admin = createServiceRoleClient();
  const { data: dons } = await admin
    .from("org_don_hoc_phi")
    .select(
      "id, ma_don, so_tien_vnd, so_ngay_cong, kenh, tao_luc, id_hoc_vien_lop",
    )
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "cho_thanh_toan")
    .order("tao_luc", { ascending: false })
    .limit(50);
  if (!dons?.length) return [];

  const hvlIds = dons.map((d) => d.id_hoc_vien_lop as string);
  const { data: hvls } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_nguoi_dung, id_khoa_hoc")
    .in("id", hvlIds);
  const userIds = [...new Set((hvls ?? []).map((h) => h.id_nguoi_dung as string))];
  const khoaIds = [...new Set((hvls ?? []).map((h) => h.id_khoa_hoc as string))];
  const [{ data: users }, { data: khoas }] = await Promise.all([
    admin
      .from("user_nguoi_dung")
      .select("id, ten_hien_thi")
      .in("id", userIds),
    admin.from("org_khoa_hoc").select("id, ten_khoa_hoc").in("id", khoaIds),
  ]);
  const nameByUser = new Map(
    (users ?? []).map((u) => [u.id as string, u.ten_hien_thi as string]),
  );
  const tenKhoaById = new Map(
    (khoas ?? []).map((k) => [k.id as string, k.ten_khoa_hoc as string]),
  );
  const hvlById = new Map((hvls ?? []).map((h) => [h.id as string, h]));

  return dons.map((d) => {
    const hvl = hvlById.get(d.id_hoc_vien_lop as string);
    return {
      id: d.id as string,
      maDon: (d.ma_don as string | null) ?? null,
      soTienVnd: Number(d.so_tien_vnd) || 0,
      soNgayCong: d.so_ngay_cong as number,
      kenh: d.kenh as string,
      taoLuc: d.tao_luc as string,
      tenHienThi: hvl
        ? nameByUser.get(hvl.id_nguoi_dung as string) ?? "HV"
        : "HV",
      tenKhoa: hvl
        ? tenKhoaById.get(hvl.id_khoa_hoc as string) ?? "Khóa"
        : "Khóa",
    };
  });
}
