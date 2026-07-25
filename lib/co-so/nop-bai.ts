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
};

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
      "id, id_hoc_vien_lop, id_bai_tap, trang_thai, diem, ghi_chu, id_tin_nhan, id_media, tao_luc",
    )
    .in("id_hoc_vien_lop", hvlIds)
    .eq("trang_thai", "cho_duyet")
    .order("tao_luc", { ascending: false })
    .limit(80);
  if (!nops?.length) return [];

  const baiIds = [...new Set(nops.map((n) => n.id_bai_tap as string))];
  const userIds = [
    ...new Set(
      (hvls ?? []).map((h) => h.id_nguoi_dung as string),
    ),
  ];
  const [{ data: bais }, { data: users }] = await Promise.all([
    admin
      .from("org_bai_tap")
      .select("id, ten_bai_tap")
      .in("id", baiIds),
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
  }));
}

export async function duyetNopBai(input: {
  orgId: string;
  nopId: string;
  actorId: string;
  trangThai: "dat" | "lam_lai";
  diem?: number | null;
  ghiChu?: string | null;
  /** Nếu dat + có baiTiepId → gán tiến độ + thong_bao mở khóa. */
  baiTiepId?: string | null;
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
    await ganTienDoBai({
      orgId: input.orgId,
      hocVienLopId: hvl.id as string,
      baiTapId: input.baiTiepId,
      actorId: input.actorId,
      publishThongBao: input.publishThongBao !== false,
    });
  }

  return { ok: true };
}

export async function ganTienDoBai(input: {
  orgId: string;
  hocVienLopId: string;
  baiTapId: string;
  actorId: string;
  publishThongBao?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_khoa_hoc, id_nguoi_dung")
    .eq("id", input.hocVienLopId)
    .maybeSingle();
  if (!hvl) return { ok: false, error: "Không tìm thấy ghi danh." };

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, id_to_chuc, ten_khoa_hoc")
    .eq("id", hvl.id_khoa_hoc as string)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== input.orgId) {
    return { ok: false, error: "Khóa không thuộc cơ sở." };
  }

  const { data: bai } = await admin
    .from("org_bai_tap")
    .select("id, ten_bai_tap, id_khoa_hoc")
    .eq("id", input.baiTapId)
    .maybeSingle();
  if (!bai || bai.id_khoa_hoc !== khoa.id) {
    return { ok: false, error: "Bài tập không thuộc khóa." };
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("org_tien_do_bai").upsert(
    {
      id_hoc_vien_lop: input.hocVienLopId,
      id_bai_tap: input.baiTapId,
      id_nguoi_gan: input.actorId,
      cap_nhat_luc: now,
    },
    { onConflict: "id_hoc_vien_lop" },
  );
  if (error) return { ok: false, error: error.message };

  if (input.publishThongBao !== false) {
    const { data: org } = await admin
      .from("org_to_chuc")
      .select("slug")
      .eq("id", input.orgId)
      .maybeSingle();
    const href = org?.slug
      ? `/co-so/${org.slug}/khoa-hoc`
      : null;
    await admin.from("org_bai_dang").insert({
      id_to_chuc: input.orgId,
      tieu_de: `Mở khóa: ${bai.ten_bai_tap}`,
      tom_tat: `Bài tập mới trên khóa ${khoa.ten_khoa_hoc}${href ? ` — xem tại trang khóa` : ""}`,
      noi_dung: `Học viên đã được mở bài «${bai.ten_bai_tap}».`,
      noi_dung_blocks: [],
      loai_bai_dang: "thong_bao",
      trang_thai: "da_dang",
    });
  }

  return { ok: true };
}

export async function listBaiTapCuaKhoa(
  khoaId: string,
): Promise<Array<{ id: string; ten: string; thuTu: number }>> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_bai_tap")
    .select("id, ten_bai_tap, thu_tu")
    .eq("id_khoa_hoc", khoaId)
    .eq("visible", true)
    .order("thu_tu");
  return (data ?? []).map((b) => ({
    id: b.id as string,
    ten: b.ten_bai_tap as string,
    thuTu: (b.thu_tu as number) ?? 0,
  }));
}
