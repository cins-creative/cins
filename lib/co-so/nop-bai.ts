import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type NopBaiRow = {
  id: string;
  hocVienLopId: string;
  baiTapId: string;
  tenBaiTap: string;
  trangThai: string;
  diem: number | null;
  ghiChu: string | null;
  tinNhanId: string | null;
  mediaId: string | null;
  tenHienThi: string;
  taoLuc: string;
  luuLuc: string | null;
  cotMocId: string | null;
};

/** Bài thuộc bộ giáo trình của khóa (hoặc legacy id_khoa_hoc). */
export async function assertBaiTapThuocKhoa(
  khoaId: string,
  baiTapId: string,
  orgId: string,
): Promise<{ ok: true; tenBaiTap: string } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, id_to_chuc, id_bo_giao_trinh")
    .eq("id", khoaId)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== orgId) {
    return { ok: false, error: "Khóa không thuộc cơ sở." };
  }

  const { data: bai } = await admin
    .from("org_bai_tap")
    .select("id, ten_bai_tap, id_to_chuc, id_khoa_hoc")
    .eq("id", baiTapId)
    .maybeSingle();
  if (!bai) return { ok: false, error: "Không tìm thấy bài tập." };
  if (bai.id_to_chuc && bai.id_to_chuc !== orgId) {
    return { ok: false, error: "Bài tập không thuộc cơ sở." };
  }

  if (khoa.id_bo_giao_trinh) {
    const { data: gan } = await admin
      .from("org_giao_trinh_bai")
      .select("id_bai_tap")
      .eq("id_bo", khoa.id_bo_giao_trinh as string)
      .eq("id_bai_tap", baiTapId)
      .maybeSingle();
    if (gan?.id_bai_tap) {
      return { ok: true, tenBaiTap: bai.ten_bai_tap as string };
    }
  }

  // Fallback legacy: module còn gắn id_khoa_hoc
  if (bai.id_khoa_hoc === khoaId) {
    return { ok: true, tenBaiTap: bai.ten_bai_tap as string };
  }

  return { ok: false, error: "Bài tập không thuộc giáo trình khóa này." };
}

/** HV nộp bài đang mở (theo org_tien_do_bai) kèm tin chat tùy chọn. */
export async function nopBaiHienTai(input: {
  studentUserId: string;
  lopId: string;
  tinNhanId?: string | null;
  mediaId?: string | null;
  ghiChu?: string | null;
}): Promise<{ ok: true; nopId: string } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_khoa_hoc")
    .eq("id_nguoi_dung", input.studentUserId)
    .eq("id_lop_hoc", input.lopId)
    .maybeSingle();
  if (!hvl?.id) return { ok: false, error: "Không thuộc lớp này." };

  const { data: tienDo } = await admin
    .from("org_tien_do_bai")
    .select("id_bai_tap")
    .eq("id_hoc_vien_lop", hvl.id)
    .maybeSingle();
  if (!tienDo?.id_bai_tap) {
    return { ok: false, error: "Chưa có bài tập được mở." };
  }

  const { data: nop, error } = await admin
    .from("org_nop_bai")
    .insert({
      id_hoc_vien_lop: hvl.id,
      id_bai_tap: tienDo.id_bai_tap,
      id_tin_nhan: input.tinNhanId ?? null,
      id_media: input.mediaId ?? null,
      ghi_chu: input.ghiChu?.trim() || null,
      trang_thai: "cho_duyet",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !nop) {
    return { ok: false, error: error?.message ?? "Không nộp được." };
  }
  return { ok: true, nopId: nop.id };
}

export async function listNopBaiChoDuyet(
  orgId: string,
): Promise<NopBaiRow[]> {
  const admin = createServiceRoleClient();
  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id_to_chuc", orgId);
  const khoaIds = (khoaRows ?? []).map((k) => k.id as string);
  if (khoaIds.length === 0) return [];

  const { data: hvls } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_nguoi_dung")
    .in("id_khoa_hoc", khoaIds);
  const hvlIds = (hvls ?? []).map((h) => h.id as string);
  if (hvlIds.length === 0) return [];

  const { data: nops } = await admin
    .from("org_nop_bai")
    .select(
      "id, id_hoc_vien_lop, id_bai_tap, trang_thai, diem, ghi_chu, id_tin_nhan, id_media, tao_luc, luu_luc, id_cot_moc",
    )
    .in("id_hoc_vien_lop", hvlIds)
    .eq("trang_thai", "cho_duyet")
    .order("tao_luc", { ascending: false })
    .limit(80);
  if (!nops?.length) return [];

  const baiIds = [...new Set(nops.map((n) => n.id_bai_tap as string))];
  const userIds = [
    ...new Set((hvls ?? []).map((h) => h.id_nguoi_dung as string)),
  ];
  const [{ data: bais }, { data: users }] = await Promise.all([
    admin.from("org_bai_tap").select("id, ten_bai_tap").in("id", baiIds),
    admin
      .from("user_nguoi_dung")
      .select("id, ten_hien_thi")
      .in("id", userIds),
  ]);
  const tenBai = new Map(
    (bais ?? []).map((b) => [b.id as string, b.ten_bai_tap as string]),
  );
  const tenUser = new Map(
    (users ?? []).map((u) => [u.id as string, u.ten_hien_thi as string]),
  );
  const hvlUser = new Map(
    (hvls ?? []).map((h) => [h.id as string, h.id_nguoi_dung as string]),
  );

  return nops.map((n) => ({
    id: n.id as string,
    hocVienLopId: n.id_hoc_vien_lop as string,
    baiTapId: n.id_bai_tap as string,
    tenBaiTap: tenBai.get(n.id_bai_tap as string) ?? "Bài tập",
    trangThai: n.trang_thai as string,
    diem: n.diem != null ? Number(n.diem) : null,
    ghiChu: (n.ghi_chu as string | null) ?? null,
    tinNhanId: (n.id_tin_nhan as string | null) ?? null,
    mediaId: (n.id_media as string | null) ?? null,
    tenHienThi:
      tenUser.get(hvlUser.get(n.id_hoc_vien_lop as string) ?? "") ?? "HV",
    taoLuc: n.tao_luc as string,
    luuLuc: (n.luu_luc as string | null) ?? null,
    cotMocId: (n.id_cot_moc as string | null) ?? null,
  }));
}

export async function duyetNopBai(input: {
  orgId: string;
  nopId: string;
  actorId: string;
  trangThai: "dat" | "lam_lai";
  diem?: number | null;
  ghiChu?: string | null;
  baiTiepId?: string | null;
  /** @deprecated Không còn publish org_bai_dang — giữ để compat API. */
  publishThongBao?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: nop } = await admin
    .from("org_nop_bai")
    .select("id, id_hoc_vien_lop, id_bai_tap")
    .eq("id", input.nopId)
    .maybeSingle();
  if (!nop) return { ok: false, error: "Không tìm thấy bài nộp." };

  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_khoa_hoc")
    .eq("id", nop.id_hoc_vien_lop as string)
    .maybeSingle();
  if (!hvl) return { ok: false, error: "Ghi danh không tồn tại." };

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, id_to_chuc, ten_khoa_hoc")
    .eq("id", hvl.id_khoa_hoc as string)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== input.orgId) {
    return { ok: false, error: "Không thuộc cơ sở này." };
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("org_nop_bai")
    .update({
      trang_thai: input.trangThai,
      diem: input.diem ?? null,
      ghi_chu: input.ghiChu?.trim() || null,
      id_nguoi_duyet: input.actorId,
      duyet_luc: now,
      cap_nhat_luc: now,
    })
    .eq("id", input.nopId);
  if (error) return { ok: false, error: error.message };

  if (input.trangThai === "dat" && input.baiTiepId) {
    const { moBaiChoHocVien } = await import("@/lib/co-so/tien-do-bai");
    await moBaiChoHocVien({
      orgId: input.orgId,
      hocVienLopId: hvl.id as string,
      baiTapIds: [input.baiTiepId],
      actorId: input.actorId,
    });
  }

  return { ok: true };
}

/**
 * Upsert con trỏ bài hiện tại + (nếu có bảng mo) ghi lịch sử.
 * Không spam org_bai_dang. Tin system do tien-do-bai gửi.
 */
export async function ganTienDoBai(input: {
  orgId: string;
  hocVienLopId: string;
  baiTapId: string;
  actorId: string;
  /** @deprecated Bỏ — không còn insert org_bai_dang. */
  publishThongBao?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { moBaiChoHocVien } = await import("@/lib/co-so/tien-do-bai");
  const result = await moBaiChoHocVien({
    orgId: input.orgId,
    hocVienLopId: input.hocVienLopId,
    baiTapIds: [input.baiTapId],
    actorId: input.actorId,
  });
  if (!result.ok) return result;
  return { ok: true };
}

export async function luuBaiNop(input: {
  orgId: string;
  nopId: string;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: nop } = await admin
    .from("org_nop_bai")
    .select(
      "id, id_hoc_vien_lop, id_bai_tap, id_media, luu_luc, id_cot_moc",
    )
    .eq("id", input.nopId)
    .maybeSingle();
  if (!nop) return { ok: false, error: "Không tìm thấy bài nộp." };
  if (nop.id_cot_moc) {
    return { ok: false, error: "Bài đã đăng Journey — không đổi trạng thái lưu." };
  }
  if (!nop.id_media) {
    return { ok: false, error: "Chỉ lưu bài có ảnh/media." };
  }

  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_khoa_hoc, id_lop_hoc, id_nguoi_dung")
    .eq("id", nop.id_hoc_vien_lop as string)
    .maybeSingle();
  if (!hvl) return { ok: false, error: "Ghi danh không tồn tại." };

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, id_to_chuc")
    .eq("id", hvl.id_khoa_hoc as string)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== input.orgId) {
    return { ok: false, error: "Không thuộc cơ sở này." };
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("org_nop_bai")
    .update({
      luu_luc: now,
      id_nguoi_luu: input.actorId,
      cap_nhat_luc: now,
    })
    .eq("id", input.nopId);
  if (error) return { ok: false, error: error.message };

  const { data: bai } = await admin
    .from("org_bai_tap")
    .select("ten_bai_tap")
    .eq("id", nop.id_bai_tap as string)
    .maybeSingle();
  const tenBai = (bai?.ten_bai_tap as string) || "Bài tập";

  if (hvl.id_lop_hoc) {
    const { guiTinHeThongLopBai } = await import("@/lib/co-so/lop-he-thong-tin");
    await guiTinHeThongLopBai({
      lopId: hvl.id_lop_hoc as string,
      actorId: input.actorId,
      loai: "luu_bai",
      idNguoiDung: hvl.id_nguoi_dung as string,
      idHocVienLop: hvl.id as string,
      idBaiTap: nop.id_bai_tap as string,
      tenBai,
      idNopBai: nop.id as string,
    });
  }

  return { ok: true };
}

export async function boLuuBaiNop(input: {
  orgId: string;
  nopId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: nop } = await admin
    .from("org_nop_bai")
    .select("id, id_hoc_vien_lop, luu_luc, id_cot_moc")
    .eq("id", input.nopId)
    .maybeSingle();
  if (!nop) return { ok: false, error: "Không tìm thấy bài nộp." };
  if (nop.id_cot_moc) {
    return { ok: false, error: "Đã đăng Journey — không bỏ lưu." };
  }

  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_khoa_hoc")
    .eq("id", nop.id_hoc_vien_lop as string)
    .maybeSingle();
  if (!hvl) return { ok: false, error: "Ghi danh không tồn tại." };

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, id_to_chuc")
    .eq("id", hvl.id_khoa_hoc as string)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== input.orgId) {
    return { ok: false, error: "Không thuộc cơ sở này." };
  }

  const { error } = await admin
    .from("org_nop_bai")
    .update({
      luu_luc: null,
      id_nguoi_luu: null,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", input.nopId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listBaiTapCuaKhoa(
  khoaId: string,
): Promise<
  Array<{ id: string; ten: string; thuTu: number; thuocTinh: string }>
> {
  const admin = createServiceRoleClient();
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id_bo_giao_trinh")
    .eq("id", khoaId)
    .maybeSingle();

  if (khoa?.id_bo_giao_trinh) {
    const { data } = await admin
      .from("org_giao_trinh_bai")
      .select("thu_tu, thuoc_tinh, org_bai_tap!inner(id, ten_bai_tap)")
      .eq("id_bo", khoa.id_bo_giao_trinh as string)
      .order("thu_tu", { ascending: true });
    return (data ?? []).map((row) => {
      const bt = row.org_bai_tap as unknown as {
        id: string;
        ten_bai_tap: string;
      };
      return {
        id: bt.id,
        ten: bt.ten_bai_tap,
        thuTu: (row.thu_tu as number) ?? 0,
        thuocTinh: (row.thuoc_tinh as string) || "bai_tap",
      };
    });
  }

  const { data } = await admin
    .from("org_bai_tap")
    .select("id, ten_bai_tap, thu_tu")
    .eq("id_khoa_hoc", khoaId)
    .order("thu_tu");
  return (data ?? []).map((b) => ({
    id: b.id as string,
    ten: b.ten_bai_tap as string,
    thuTu: (b.thu_tu as number) ?? 0,
    thuocTinh: "bai_tap",
  }));
}
