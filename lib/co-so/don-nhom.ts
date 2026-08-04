import "server-only";

import {
  listCombo,
  toMatchCandidates,
  timComboKhopNhat,
  type ComboHocPhi,
} from "@/lib/co-so/combo-hoc-phi";
import type { GioHangItem } from "@/lib/co-so/combo-hoc-phi-tinh";
import { xacNhanDonHocPhi } from "@/lib/co-so/don-hoc-phi";
import {
  donHocPhiToChatContext,
  getOrgThanhToanFromCauHinh,
} from "@/lib/co-so/don-hoc-phi-chat";
import {
  buildHocPhiMaDon,
  isHocPhiMaDonUniqueViolation,
} from "@/lib/co-so/ma-don-hoc-phi";
import { findOrCreateOrgStudentRoom } from "@/lib/chat/org-message";
import { sendRoomMessage } from "@/lib/chat/direct-message";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type DonItemInput = {
  hocVienLopId: string;
  goiId: string;
};

type ResolvedLine = {
  key: string;
  hocVienLopId: string;
  userId: string;
  khoaId: string;
  tenKhoa: string;
  maKhoaHoc: string | null;
  maLop: string | null;
  goiId: string;
  tenGoi: string;
  soNgayCong: number;
  giaGocVnd: number;
  giamVnd: number;
  soTienVnd: number;
};

async function resolveLines(
  orgId: string,
  items: DonItemInput[],
): Promise<{ ok: true; lines: ResolvedLine[] } | { ok: false; error: string }> {
  if (items.length === 0) return { ok: false, error: "Thiếu items." };

  const admin = createServiceRoleClient();
  const hvlIds = items.map((i) => i.hocVienLopId);
  const goiIds = [...new Set(items.map((i) => i.goiId))];

  const { data: hvlRows, error: hvlErr } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_nguoi_dung, id_khoa_hoc, id_lop_hoc")
    .in("id", hvlIds);
  if (hvlErr) return { ok: false, error: hvlErr.message };
  const hvlMap = new Map((hvlRows ?? []).map((r) => [r.id as string, r]));

  const khoaIds = [
    ...new Set(
      (hvlRows ?? []).map((r) => r.id_khoa_hoc as string).filter(Boolean),
    ),
  ];
  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id, ten_khoa_hoc, id_to_chuc, ma_khoa_hoc")
    .in("id", khoaIds);
  const khoaMap = new Map(
    (khoaRows ?? []).map((k) => [
      k.id as string,
      {
        ten: (k.ten_khoa_hoc as string) ?? "Khóa",
        orgId: k.id_to_chuc as string,
        maKhoaHoc: (k.ma_khoa_hoc as string | null) ?? null,
      },
    ]),
  );

  const lopIds = [
    ...new Set(
      (hvlRows ?? [])
        .map((r) => r.id_lop_hoc as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const maLopMap = new Map<string, string | null>();
  if (lopIds.length) {
    const { data: lopRows } = await admin
      .from("org_lop_hoc")
      .select("id, ma_lop")
      .in("id", lopIds);
    for (const l of lopRows ?? []) {
      maLopMap.set(l.id as string, (l.ma_lop as string | null) ?? null);
    }
  }

  const { data: goiRows, error: goiErr } = await admin
    .from("org_goi_hoc_phi")
    .select("id, ten, gia_vnd, so_ngay, id_to_chuc, dang_ban")
    .in("id", goiIds)
    .eq("id_to_chuc", orgId);
  if (goiErr) return { ok: false, error: goiErr.message };
  const goiMap = new Map(
    (goiRows ?? []).map((g) => [
      g.id as string,
      {
        ten: (g.ten as string) ?? "Gói",
        gia: Number(g.gia_vnd) || 0,
        soNgay: Number(g.so_ngay) || 0,
        dangBan: Boolean(g.dang_ban),
      },
    ]),
  );

  const lines: ResolvedLine[] = [];
  let userId: string | null = null;

  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    const hvl = hvlMap.get(it.hocVienLopId);
    if (!hvl) return { ok: false, error: "Không tìm thấy ghi danh." };
    const khoa = khoaMap.get(hvl.id_khoa_hoc as string);
    if (!khoa || khoa.orgId !== orgId) {
      return { ok: false, error: "Ghi danh không thuộc cơ sở này." };
    }
    const goi = goiMap.get(it.goiId);
    if (!goi) return { ok: false, error: `Không tìm thấy gói: ${it.goiId}` };
    if (!goi.dangBan) return { ok: false, error: `Gói đã ẩn: ${goi.ten}` };
    if (goi.soNgay < 1) return { ok: false, error: "Gói không có số ngày hợp lệ." };

    const uid = hvl.id_nguoi_dung as string;
    if (userId == null) userId = uid;
    else if (userId !== uid) {
      return { ok: false, error: "Tất cả dòng đơn phải cùng một học viên." };
    }

    lines.push({
      key: `${it.hocVienLopId}:${it.goiId}:${i}`,
      hocVienLopId: it.hocVienLopId,
      userId: uid,
      khoaId: hvl.id_khoa_hoc as string,
      tenKhoa: khoa.ten,
      maKhoaHoc: khoa.maKhoaHoc,
      maLop: hvl.id_lop_hoc
        ? (maLopMap.get(hvl.id_lop_hoc as string) ?? null)
        : null,
      goiId: it.goiId,
      tenGoi: goi.ten,
      soNgayCong: goi.soNgay,
      giaGocVnd: goi.gia,
      giamVnd: 0,
      soTienVnd: goi.gia,
    });
  }

  return { ok: true, lines };
}

function applyComboToLines(
  lines: ResolvedLine[],
  combos: ComboHocPhi[],
): {
  lines: ResolvedLine[];
  combo: ComboHocPhi | null;
  giaGocVnd: number;
  giamVnd: number;
  tongVnd: number;
} {
  const gio: GioHangItem[] = lines.map((l) => ({
    key: l.key,
    khoaId: l.khoaId,
    goiId: l.goiId,
    giaGocVnd: l.giaGocVnd,
  }));
  const match = timComboKhopNhat(gio, toMatchCandidates(combos));
  const giaGocVnd = lines.reduce((s, l) => s + l.giaGocVnd, 0);
  if (!match) {
    return {
      lines,
      combo: null,
      giaGocVnd,
      giamVnd: 0,
      tongVnd: giaGocVnd,
    };
  }
  const byKey = new Map(match.phanBo.map((p) => [p.key, p]));
  const next = lines.map((l) => {
    const p = byKey.get(l.key);
    return {
      ...l,
      giamVnd: p?.giamVnd ?? 0,
      soTienVnd: p?.soTienVnd ?? l.giaGocVnd,
    };
  });
  const combo = combos.find((c) => c.id === match.combo.id) ?? null;
  return {
    lines: next,
    combo,
    giaGocVnd: match.tinh.giaGocVnd,
    giamVnd: match.tinh.giamVnd,
    tongVnd: match.tinh.tongVnd,
  };
}

/**
 * Tạo 1+ đơn từ gói (giá server). ≥2 dòng khớp combo → nhóm + 1 QR ma_nhom.
 */
export async function createDonTuGoi(input: {
  orgId: string;
  staffUserId: string;
  items: DonItemInput[];
  ghiChu?: string | null;
  mode: "chat" | "tien_mat";
  autoConfirm?: boolean;
  selfServe?: boolean;
  chiNhanhId?: string | null;
}): Promise<
  | {
      ok: true;
      donIds: string[];
      nhomId: string | null;
      maNhom: string | null;
      roomId: string | null;
      tongVnd: number;
      giamVnd: number;
      confirmed: boolean;
    }
  | { ok: false; error: string }
> {
  const resolved = await resolveLines(input.orgId, input.items);
  if (!resolved.ok) return resolved;

  const combos = await listCombo(input.orgId, { includeHidden: false });
  const priced = applyComboToLines(resolved.lines, combos);
  const admin = createServiceRoleClient();
  const userId = priced.lines[0]!.userId;

  const useNhom = priced.lines.length >= 2 && priced.giamVnd > 0 && priced.combo;
  let nhomId: string | null = null;
  let maNhom: string | null = null;

  if (useNhom && priced.combo) {
    maNhom = `HPN${Date.now().toString(36).toUpperCase()}`;
    const { data: nhom, error: nhomErr } = await admin
      .from("org_nhom_don_hoc_phi")
      .insert({
        id_to_chuc: input.orgId,
        id_nguoi_dung: userId,
        id_combo: priced.combo.id,
        ma_nhom: maNhom,
        ten_combo_luu: priced.combo.ten,
        loai_giam_luu: priced.combo.loaiGiam,
        gia_tri_giam_luu: priced.combo.giaTriGiam,
        gia_goc_vnd: priced.giaGocVnd,
        giam_vnd: priced.giamVnd,
        tong_vnd: priced.tongVnd,
      })
      .select("id")
      .single<{ id: string }>();
    if (nhomErr || !nhom) {
      return { ok: false, error: nhomErr?.message ?? "Không tạo nhóm đơn." };
    }
    nhomId = nhom.id;
  }

  // Multi-line without combo discount: still group for one QR if ≥2
  if (!nhomId && priced.lines.length >= 2) {
    maNhom = `HPN${Date.now().toString(36).toUpperCase()}`;
    const { data: nhom, error: nhomErr } = await admin
      .from("org_nhom_don_hoc_phi")
      .insert({
        id_to_chuc: input.orgId,
        id_nguoi_dung: userId,
        id_combo: null,
        ma_nhom: maNhom,
        ten_combo_luu: null,
        loai_giam_luu: null,
        gia_tri_giam_luu: null,
        gia_goc_vnd: priced.giaGocVnd,
        giam_vnd: priced.giamVnd,
        tong_vnd: priced.tongVnd,
      })
      .select("id")
      .single<{ id: string }>();
    if (nhomErr || !nhom) {
      return { ok: false, error: nhomErr?.message ?? "Không tạo nhóm đơn." };
    }
    nhomId = nhom.id;
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("ten, avatar_id, cau_hinh")
    .eq("id", input.orgId)
    .maybeSingle<{
      ten: string | null;
      avatar_id: string | null;
      cau_hinh: unknown;
    }>();
  const stk = getOrgThanhToanFromCauHinh(org?.cau_hinh);
  const orgTen = org?.ten?.trim() || null;
  const orgAnh = getAvatarUrl(org?.avatar_id ?? null);
  const kenhChat =
    stk.nganHang && stk.soTaiKhoan ? "vietqr" : "ck_thu_cong";
  const kenh = input.mode === "tien_mat" ? "tien_mat" : kenhChat;

  const donIds: string[] = [];
  const lineMaDons: string[] = [];

  for (let i = 0; i < priced.lines.length; i++) {
    const line = priced.lines[i]!;
    let maDon = buildHocPhiMaDon(line.maKhoaHoc, line.maLop);

    let don: { id: string } | null = null;
    let lastError: { message?: string } | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const { data, error } = await admin
        .from("org_don_hoc_phi")
        .insert({
          id_to_chuc: input.orgId,
          id_hoc_vien_lop: line.hocVienLopId,
          id_goi: line.goiId,
          id_nhom: nhomId,
          id_chi_nhanh: input.chiNhanhId ?? null,
          id_nguoi_thu: input.selfServe ? null : input.staffUserId,
          ma_don: maDon,
          kenh,
          trang_thai: "cho_thanh_toan",
          so_tien_vnd: line.soTienVnd,
          gia_goc_vnd: line.giaGocVnd,
          giam_vnd: line.giamVnd,
          so_ngay_cong: line.soNgayCong,
          ghi_chu: input.ghiChu ?? null,
        })
        .select("id")
        .single<{ id: string }>();
      if (!error && data) {
        don = data;
        break;
      }
      lastError = error;
      if (!isHocPhiMaDonUniqueViolation(error)) break;
      maDon = buildHocPhiMaDon(line.maKhoaHoc, line.maLop);
    }

    if (!don) {
      return { ok: false, error: lastError?.message ?? "Không tạo được đơn." };
    }
    donIds.push(don.id);
    lineMaDons.push(maDon);
  }

  let roomId: string | null = null;
  let confirmed = false;

  if (input.mode === "chat") {
    roomId = await findOrCreateOrgStudentRoom(input.orgId, userId);

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

    const primaryDonId = donIds[0]!;
    const linesDesc: string[] = [];
    if (priced.combo) {
      linesDesc.push(`Combo: ${priced.combo.ten}`);
      if (priced.giamVnd > 0) {
        linesDesc.push(
          `Giá gốc: ${priced.giaGocVnd.toLocaleString("vi-VN")}đ`,
        );
        linesDesc.push(
          `Giảm: −${priced.giamVnd.toLocaleString("vi-VN")}đ`,
        );
      }
    }
    for (const line of priced.lines) {
      linesDesc.push(
        `${line.tenKhoa}${line.maLop ? ` · Lớp: ${line.maLop}` : ""} · ${line.tenGoi} · ${line.soNgayCong} ngày · ${line.soTienVnd.toLocaleString("vi-VN")}đ`,
      );
    }

    /* Nhóm: CK / QR dùng ma_nhom. Đơn lẻ: mã dòng = BCMONL248291. */
    const ckMa = maNhom ?? lineMaDons[0]!;
    const ctx = donHocPhiToChatContext({
      id: primaryDonId,
      maDon: ckMa,
      soTienVnd: priced.tongVnd,
      soNgayCong: priced.lines.reduce((s, l) => s + l.soNgayCong, 0),
      trangThai: "cho_thanh_toan",
      nganHang: stk.nganHang,
      soTaiKhoan: stk.soTaiKhoan,
      tenChuTk: stk.tenChuTk,
      orgTen,
      orgAnh,
      overrideMoTaLines: [
        ...linesDesc,
        `Tổng: ${priced.tongVnd.toLocaleString("vi-VN")}đ`,
        "Tình trạng: Chờ thanh toán",
        ...(stk.nganHang && stk.soTaiKhoan
          ? [
              `NH: ${stk.nganHang}`,
              `STK: ${stk.soTaiKhoan}`,
              ...(stk.tenChuTk ? [`Chủ TK: ${stk.tenChuTk}`] : []),
            ]
          : []),
        `Nội dung CK: ${ckMa}`,
      ],
      qrAmountVnd: priced.tongVnd,
      qrAddInfo: ckMa,
    });

    const sent = await sendRoomMessage(roomId, input.staffUserId, {
      body: ctx.tieuDe,
      nguCanh: ctx,
    });
    if (!sent.ok) return { ok: false, error: sent.error };

    await admin
      .from("org_don_hoc_phi")
      .update({ id_tin_nhan: sent.message.id })
      .in("id", donIds);
  }

  if (input.mode === "tien_mat" && input.autoConfirm !== false) {
    for (const donId of donIds) {
      const conf = await xacNhanDonHocPhi({
        donId,
        actorId: input.staffUserId,
      });
      if (!conf.ok) return { ok: false, error: conf.error };
    }
    confirmed = true;
  }

  return {
    ok: true,
    donIds,
    nhomId,
    maNhom,
    roomId,
    tongVnd: priced.tongVnd,
    giamVnd: priced.giamVnd,
    confirmed,
  };
}

/** Xác nhận cả nhóm (idempotent từng đơn). */
export async function xacNhanNhomDon(input: {
  nhomId: string;
  actorId: string;
}): Promise<
  | { ok: true; confirmed: number; skipped: number }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  const { data: dons, error } = await admin
    .from("org_don_hoc_phi")
    .select("id, trang_thai")
    .eq("id_nhom", input.nhomId);

  if (error) return { ok: false, error: error.message };
  if (!dons?.length) return { ok: false, error: "Nhóm không có đơn." };

  let confirmed = 0;
  let skipped = 0;
  for (const d of dons) {
    if (d.trang_thai === "da_nhan_tien") {
      skipped += 1;
      continue;
    }
    if (d.trang_thai === "huy") {
      skipped += 1;
      continue;
    }
    const r = await xacNhanDonHocPhi({
      donId: d.id as string,
      actorId: input.actorId,
    });
    if (!r.ok) return r;
    confirmed += 1;
  }
  return { ok: true, confirmed, skipped };
}

/** Resolve giá gói cho đơn lẻ (API legacy). */
export async function resolveGoiPrice(
  orgId: string,
  goiId: string,
): Promise<
  | { ok: true; giaVnd: number; soNgay: number; ten: string }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_goi_hoc_phi")
    .select("id, ten, gia_vnd, so_ngay, dang_ban, id_to_chuc")
    .eq("id", goiId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không tìm thấy gói." };
  }
  if (!data.dang_ban) return { ok: false, error: "Gói đã ẩn." };
  return {
    ok: true,
    giaVnd: Number(data.gia_vnd) || 0,
    soNgay: Number(data.so_ngay) || 0,
    ten: (data.ten as string) ?? "Gói",
  };
}
