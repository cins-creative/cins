import "server-only";

import { todayYmdVn } from "@/lib/co-so/ky-hoc";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { parseChiNhanhFromCauHinh } from "@/lib/truong/chi-nhanh";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";
import type { TruongChiNhanh } from "@/lib/truong/types";

const CN_COLS =
  "id, ten, dia_chi, tinh_thanh, dien_thoai, email, cover_id, dang_hoat_dong, thu_tu";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type ChiNhanhRow = {
  id: string;
  ten: string;
  diaChi: string | null;
  tinhThanh: string | null;
  dienThoai: string | null;
  email: string | null;
  /** Cloudflare Images id — cột `org_chi_nhanh.cover_id` (A25). */
  coverId: string | null;
  dangHoatDong: boolean;
  thuTu: number;
};

function mapCn(r: Record<string, unknown>): ChiNhanhRow {
  return {
    id: r.id as string,
    ten: r.ten as string,
    diaChi: (r.dia_chi as string | null) ?? null,
    tinhThanh: (r.tinh_thanh as string | null) ?? null,
    dienThoai: (r.dien_thoai as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    coverId: ((r.cover_id as string | null) ?? "").trim() || null,
    dangHoatDong: Boolean(r.dang_hoat_dong),
    thuTu: Number(r.thu_tu) || 0,
  };
}

export async function listChiNhanh(orgId: string): Promise<ChiNhanhRow[]> {
  const admin = createServiceRoleClient();
  let { data } = await admin
    .from("org_chi_nhanh")
    .select(CN_COLS)
    .eq("id_to_chuc", orgId)
    .order("thu_tu")
    .order("tao_luc");

  if (!data?.length) {
    await seedOrgChiNhanhFromCauHinh(orgId);
    const again = await admin
      .from("org_chi_nhanh")
      .select(CN_COLS)
      .eq("id_to_chuc", orgId)
      .order("thu_tu")
      .order("tao_luc");
    data = again.data;
  }

  return (data ?? []).map((r) => mapCn(r as Record<string, unknown>));
}

/** Một lần: JSON `cau_hinh.chi_nhanh` → bảng `org_chi_nhanh`. */
async function seedOrgChiNhanhFromCauHinh(orgId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("cau_hinh, dia_chi, tinh_thanh, dien_thoai, email_lien_he")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return;
  const fromJson = parseChiNhanhFromCauHinh(org.cau_hinh) ?? [];
  const rows: Array<Record<string, unknown>> = [];
  if (fromJson.length > 0) {
    for (const [i, c] of fromJson.entries()) {
      rows.push({
        id_to_chuc: orgId,
        ten: c.ten,
        dia_chi: c.dia_chi,
        tinh_thanh: c.tinh_thanh,
        dien_thoai: c.dien_thoai ?? null,
        email: c.email ?? null,
        thu_tu: i,
        dang_hoat_dong: true,
        cover_id: c.cover_id?.trim() || null,
      });
    }
  } else if (org.dia_chi?.trim()) {
    rows.push({
      id_to_chuc: orgId,
      ten: "Trụ sở",
      dia_chi: org.dia_chi.trim(),
      tinh_thanh: org.tinh_thanh,
      dien_thoai: org.dien_thoai,
      email: org.email_lien_he,
      thu_tu: 0,
      dang_hoat_dong: true,
    });
  }
  if (rows.length === 0) return;
  await admin.from("org_chi_nhanh").insert(rows);
}

/** Đồng bộ chi nhánh đang hoạt động → cột liên hệ org. Không ghi `cau_hinh.chi_nhanh`. */
export async function syncPublicContactFromOrgChiNhanh(
  orgId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("org_chi_nhanh")
    .select(CN_COLS)
    .eq("id_to_chuc", orgId)
    .order("thu_tu")
    .order("tao_luc");

  const all = (rows ?? []).filter(
    (r) => (r.ten as string)?.trim() && (r.dia_chi as string)?.trim(),
  );
  const primary = all.find((r) => r.dang_hoat_dong) ?? all[0];
  if (!primary) return;

  await admin
    .from("org_to_chuc")
    .update({
      dia_chi: (primary.dia_chi as string) || null,
      tinh_thanh: normalizeTinhThanhForDb(
        (primary.tinh_thanh as string | null) ?? null,
      ),
      dien_thoai: (primary.dien_thoai as string | null) ?? null,
      email_lien_he: (primary.email as string | null) ?? null,
    })
    .eq("id", orgId);
}

/** Ghi danh sách chi nhánh settings → bảng (SoT). Id không phải uuid = insert mới. */
export async function replaceChiNhanhList(
  orgId: string,
  list: TruongChiNhanh[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: existing, error: readErr } = await admin
    .from("org_chi_nhanh")
    .select("id")
    .eq("id_to_chuc", orgId);
  if (readErr) return { ok: false, error: readErr.message };

  const keep = new Set<string>();
  for (const [i, c] of list.entries()) {
    const row = {
      ten: c.ten,
      dia_chi: c.dia_chi,
      tinh_thanh: c.tinh_thanh,
      dien_thoai: c.dien_thoai,
      email: c.email,
      cover_id: c.cover_id?.trim() || null,
      thu_tu: i,
      dang_hoat_dong: true,
      cap_nhat_luc: new Date().toISOString(),
    };
    const id = c.id?.trim() ?? "";
    if (id && isUuid(id) && (existing ?? []).some((e) => e.id === id)) {
      const { error } = await admin
        .from("org_chi_nhanh")
        .update(row)
        .eq("id", id)
        .eq("id_to_chuc", orgId);
      if (error) return { ok: false, error: error.message };
      keep.add(id);
      continue;
    }
    const { data: created, error } = await admin
      .from("org_chi_nhanh")
      .insert({ id_to_chuc: orgId, ...row })
      .select("id")
      .single();
    if (error || !created) {
      return { ok: false, error: error?.message ?? "Không tạo được chi nhánh." };
    }
    keep.add(created.id as string);
  }

  const stale = (existing ?? [])
    .map((e) => e.id as string)
    .filter((id) => !keep.has(id));
  if (stale.length > 0) {
    const { error } = await admin
      .from("org_chi_nhanh")
      .update({
        dang_hoat_dong: false,
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id_to_chuc", orgId)
      .in("id", stale);
    if (error) return { ok: false, error: error.message };
  }

  await syncPublicContactFromOrgChiNhanh(orgId);
  return { ok: true };
}

export async function createChiNhanh(input: {
  orgId: string;
  ten: string;
  diaChi?: string | null;
  tinhThanh?: string | null;
  dienThoai?: string | null;
  email?: string | null;
  coverId?: string | null;
}): Promise<{ ok: true; row: ChiNhanhRow } | { ok: false; error: string }> {
  const ten = input.ten.trim();
  if (!ten) return { ok: false, error: "Thiếu tên chi nhánh." };
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_chi_nhanh")
    .insert({
      id_to_chuc: input.orgId,
      ten,
      dia_chi: input.diaChi?.trim() || null,
      tinh_thanh: input.tinhThanh?.trim() || null,
      dien_thoai: input.dienThoai?.trim() || null,
      email: input.email?.trim() || null,
      cover_id: input.coverId?.trim() || null,
    })
    .select(CN_COLS)
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không tạo được." };
  }
  await syncPublicContactFromOrgChiNhanh(input.orgId);
  return {
    ok: true,
    row: mapCn(data as Record<string, unknown>),
  };
}

export async function updateChiNhanh(input: {
  orgId: string;
  id: string;
  ten?: string;
  diaChi?: string | null;
  tinhThanh?: string | null;
  dienThoai?: string | null;
  email?: string | null;
  coverId?: string | null;
  dangHoatDong?: boolean;
}): Promise<{ ok: true; row: ChiNhanhRow } | { ok: false; error: string }> {
  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (input.ten !== undefined) {
    const ten = input.ten.trim();
    if (!ten) return { ok: false, error: "Thiếu tên." };
    patch.ten = ten;
  }
  if (input.diaChi !== undefined) patch.dia_chi = input.diaChi?.trim() || null;
  if (input.tinhThanh !== undefined) {
    patch.tinh_thanh = input.tinhThanh?.trim() || null;
  }
  if (input.dienThoai !== undefined) {
    patch.dien_thoai = input.dienThoai?.trim() || null;
  }
  if (input.email !== undefined) patch.email = input.email?.trim() || null;
  if (input.coverId !== undefined) {
    patch.cover_id = input.coverId?.trim() || null;
  }
  if (input.dangHoatDong !== undefined) {
    patch.dang_hoat_dong = input.dangHoatDong;
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_chi_nhanh")
    .update(patch)
    .eq("id", input.id)
    .eq("id_to_chuc", input.orgId)
    .select(CN_COLS)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không cập nhật." };
  }

  await syncPublicContactFromOrgChiNhanh(input.orgId);

  return {
    ok: true,
    row: mapCn(data as Record<string, unknown>),
  };
}

export type DiemDanhSlot = {
  userId: string;
  tenHienThi: string;
  coMat: boolean | null;
  ghiChu: string | null;
};

export async function getDiemDanhNgay(input: {
  orgId: string;
  lopId: string;
  ngay?: string;
}): Promise<
  | { ok: true; ngay: string; rows: DiemDanhSlot[] }
  | { ok: false; error: string }
> {
  const ngay = input.ngay?.trim() || todayYmdVn();
  const admin = createServiceRoleClient();

  const { data: lop } = await admin
    .from("org_lop_hoc")
    .select("id, id_khoa_hoc")
    .eq("id", input.lopId)
    .maybeSingle();
  if (!lop) return { ok: false, error: "Không tìm thấy lớp." };

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id_to_chuc")
    .eq("id", lop.id_khoa_hoc as string)
    .maybeSingle();
  if (!khoa || khoa.id_to_chuc !== input.orgId) {
    return { ok: false, error: "Lớp không thuộc cơ sở." };
  }

  const { data: hvls } = await admin
    .from("user_hoc_vien_lop")
    .select("id_nguoi_dung")
    .eq("id_lop_hoc", input.lopId)
    .in("trang_thai", ["dang_hoc", "da_dang_ky", "tam_nghi"]);
  const userIds = (hvls ?? []).map((h) => h.id_nguoi_dung as string);
  if (userIds.length === 0) {
    return { ok: true, ngay, rows: [] };
  }

  const [{ data: users }, { data: marks }] = await Promise.all([
    admin
      .from("user_nguoi_dung")
      .select("id, ten_hien_thi")
      .in("id", userIds),
    admin
      .from("org_diem_danh")
      .select("id_nguoi_dung, co_mat, ghi_chu")
      .eq("id_lop_hoc", input.lopId)
      .eq("ngay", ngay),
  ]);
  const markBy = new Map(
    (marks ?? []).map((m) => [
      m.id_nguoi_dung as string,
      {
        coMat: Boolean(m.co_mat),
        ghiChu: (m.ghi_chu as string | null) ?? null,
      },
    ]),
  );
  const rows: DiemDanhSlot[] = (users ?? []).map((u) => {
    const m = markBy.get(u.id as string);
    return {
      userId: u.id as string,
      tenHienThi: (u.ten_hien_thi as string) || "HV",
      coMat: m ? m.coMat : null,
      ghiChu: m?.ghiChu ?? null,
    };
  });
  rows.sort((a, b) => a.tenHienThi.localeCompare(b.tenHienThi, "vi"));
  return { ok: true, ngay, rows };
}

export async function saveDiemDanhNgay(input: {
  orgId: string;
  lopId: string;
  ngay: string;
  actorId: string;
  marks: Array<{ userId: string; coMat: boolean; ghiChu?: string | null }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await getDiemDanhNgay({
    orgId: input.orgId,
    lopId: input.lopId,
    ngay: input.ngay,
  });
  if (!gate.ok) return gate;

  const admin = createServiceRoleClient();
  for (const m of input.marks) {
    const { error } = await admin.from("org_diem_danh").upsert(
      {
        id_lop_hoc: input.lopId,
        id_nguoi_dung: m.userId,
        ngay: input.ngay,
        co_mat: m.coMat,
        ghi_chu: m.ghiChu?.trim() || null,
        id_nguoi_diem_danh: input.actorId,
      },
      { onConflict: "id_lop_hoc,id_nguoi_dung,ngay" },
    );
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function getDoanhThuSummary(orgId: string): Promise<{
  tongDaNhan: number;
  soDonDaNhan: number;
  soDonCho: number;
  theoKenh: Array<{ kenh: string; tong: number; soDon: number }>;
}> {
  const admin = createServiceRoleClient();
  const { data: dons } = await admin
    .from("org_don_hoc_phi")
    .select("trang_thai, kenh, so_tien_vnd")
    .eq("id_to_chuc", orgId)
    .in("trang_thai", ["da_nhan_tien", "cho_thanh_toan"]);

  let tongDaNhan = 0;
  let soDonDaNhan = 0;
  let soDonCho = 0;
  const byKenh = new Map<string, { tong: number; soDon: number }>();

  for (const d of dons ?? []) {
    const tien = Number(d.so_tien_vnd) || 0;
    if (d.trang_thai === "cho_thanh_toan") {
      soDonCho += 1;
      continue;
    }
    soDonDaNhan += 1;
    tongDaNhan += tien;
    const k = (d.kenh as string) || "khac";
    const cur = byKenh.get(k) ?? { tong: 0, soDon: 0 };
    cur.tong += tien;
    cur.soDon += 1;
    byKenh.set(k, cur);
  }

  return {
    tongDaNhan,
    soDonDaNhan,
    soDonCho,
    theoKenh: [...byKenh.entries()].map(([kenh, v]) => ({
      kenh,
      tong: v.tong,
      soDon: v.soDon,
    })),
  };
}

export async function getMarketingFunnel(orgId: string): Promise<{
  soGhiDanh: number;
  soDangHoc: number;
  soFreeze: number;
  soDonCho: number;
  soDonDaNhan: number;
}> {
  const admin = createServiceRoleClient();
  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id_to_chuc", orgId);
  const khoaIds = (khoaRows ?? []).map((k) => k.id as string);
  if (khoaIds.length === 0) {
    return {
      soGhiDanh: 0,
      soDangHoc: 0,
      soFreeze: 0,
      soDonCho: 0,
      soDonDaNhan: 0,
    };
  }

  const { data: hvls } = await admin
    .from("user_hoc_vien_lop")
    .select("id, trang_thai")
    .in("id_khoa_hoc", khoaIds);

  const soGhiDanh = hvls?.length ?? 0;
  const soDangHoc =
    hvls?.filter((h) => h.trang_thai === "dang_hoc").length ?? 0;

  const hvlIds = (hvls ?? []).map((h) => h.id as string);
  let soFreeze = 0;
  if (hvlIds.length > 0) {
    const today = todayYmdVn();
    const { data: kys } = await admin
      .from("org_ky_hoc")
      .select("id_hoc_vien_lop, ngay_cuoi")
      .in("id_hoc_vien_lop", hvlIds);
    const maxEnd = new Map<string, string>();
    for (const k of kys ?? []) {
      const id = k.id_hoc_vien_lop as string;
      const end = k.ngay_cuoi as string;
      const prev = maxEnd.get(id);
      if (!prev || end > prev) maxEnd.set(id, end);
    }
    for (const id of hvlIds) {
      const end = maxEnd.get(id);
      if (!end || end < today) soFreeze += 1;
    }
  }

  const { count: soDonCho } = await admin
    .from("org_don_hoc_phi")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "cho_thanh_toan");
  const { count: soDonDaNhan } = await admin
    .from("org_don_hoc_phi")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "da_nhan_tien");

  return {
    soGhiDanh,
    soDangHoc,
    soFreeze,
    soDonCho: soDonCho ?? 0,
    soDonDaNhan: soDonDaNhan ?? 0,
  };
}
