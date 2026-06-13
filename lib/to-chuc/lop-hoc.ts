import "server-only";

import { slugifyOrgName } from "@/lib/cong-dong/org-slug";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { canViewerManageKhoaHoc } from "./khoa-hoc";
import type {
  HinhThucLop,
  LoaiMoHinhKhoa,
  LopHocFormInput,
  TrangThaiLop,
} from "./khoa-hoc-types";

const HINH_THUC_SET = new Set<string>(["truc_tiep", "truc_tuyen", "ket_hop"]);
const TRANG_THAI_LOP_SET = new Set<string>([
  "sap_khai_giang",
  "dang_hoc",
  "da_ket_thuc",
  "huy",
]);

function buildMaLop(tenKhoa: string, ngayIso: string): string {
  const slugPart = slugifyOrgName(tenKhoa).slice(0, 24) || "lop";
  const datePart = ngayIso.replace(/-/g, "");
  return `${slugPart}-${datePart}`.slice(0, 48);
}

function resolveNgayKhaiGiang(
  _loaiMoHinh: LoaiMoHinhKhoa,
  ngayKhaiGiang: string | null | undefined,
): string {
  return ngayKhaiGiang?.trim() ?? "";
}

function resolveLichHoc(
  loaiMoHinh: LoaiMoHinhKhoa,
  lichHoc: string | null | undefined,
): string | null {
  const trimmed = lichHoc?.trim();
  if (trimmed) return trimmed;
  if (loaiMoHinh === "lien_tuc_theo_thang") return "Khai giảng hàng tuần";
  return null;
}

function resolveMaLop(
  tenKhoa: string,
  ngayIso: string,
  customMa: string | null | undefined,
): string {
  const trimmed = customMa?.trim();
  if (trimmed) return trimmed.slice(0, 48);
  return buildMaLop(tenKhoa, ngayIso);
}

type KhoaContext = {
  id: string;
  tenKhoaHoc: string;
  loaiMoHinh: LoaiMoHinhKhoa;
};

async function fetchKhoaContext(
  orgId: string,
  khoaId: string,
): Promise<KhoaContext | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_khoa_hoc")
    .select("id, ten_khoa_hoc, loai_mo_hinh")
    .eq("id_to_chuc", orgId)
    .eq("id", khoaId)
    .maybeSingle();
  if (!data?.id) return null;
  return {
    id: data.id as string,
    tenKhoaHoc: data.ten_khoa_hoc as string,
    loaiMoHinh: data.loai_mo_hinh as LoaiMoHinhKhoa,
  };
}

function validateLopInput(
  khoa: KhoaContext,
  input: LopHocFormInput,
): { ok: true; data: Required<Pick<LopHocFormInput, "hinhThuc" | "trangThaiLop">> & LopHocFormInput } | { ok: false; error: string } {
  const hinhThuc = input.hinhThuc ?? "truc_tiep";
  if (!HINH_THUC_SET.has(hinhThuc)) {
    return { ok: false, error: "Hình thức lớp không hợp lệ." };
  }

  const trangThaiLop = input.trangThaiLop ?? "sap_khai_giang";
  if (!TRANG_THAI_LOP_SET.has(trangThaiLop)) {
    return { ok: false, error: "Trạng thái lớp không hợp lệ." };
  }

  const ngay = resolveNgayKhaiGiang(khoa.loaiMoHinh, input.ngayKhaiGiang);
  if (!ngay) {
    return { ok: false, error: "Vui lòng chọn ngày khai giảng cho lớp học." };
  }

  if (
    input.slotToiDa != null &&
    (!Number.isInteger(input.slotToiDa) || input.slotToiDa < 1)
  ) {
    return { ok: false, error: "Sĩ số tối đa phải là số nguyên dương." };
  }

  return {
    ok: true,
    data: {
      ...input,
      hinhThuc,
      trangThaiLop,
      ngayKhaiGiang: ngay,
      lichHoc: resolveLichHoc(khoa.loaiMoHinh, input.lichHoc),
      giaoVienPhuTrach: input.giaoVienPhuTrach?.trim() || null,
      giaoVienText: input.giaoVienText?.trim() || null,
      maLop: input.maLop?.trim() || null,
    },
  };
}

function buildLopRow(
  khoa: KhoaContext,
  data: LopHocFormInput & {
    hinhThuc: HinhThucLop;
    trangThaiLop: TrangThaiLop;
    ngayKhaiGiang: string;
    lichHoc: string | null;
    giaoVienPhuTrach: string | null;
    giaoVienText: string | null;
    maLop: string | null;
  },
  existingMaLop?: string | null,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    hinh_thuc: data.hinhThuc,
    ngay_khai_giang: data.ngayKhaiGiang,
    trang_thai: data.trangThaiLop,
  };

  if (data.lichHoc != null) row.lich_hoc = data.lichHoc;
  if (data.slotToiDa != null) row.slot_toi_da = data.slotToiDa;

  const maLop = data.maLop
    ? data.maLop.slice(0, 48)
    : existingMaLop ?? buildMaLop(khoa.tenKhoaHoc, data.ngayKhaiGiang);
  row.ma_lop = maLop;

  if (data.giaoVienPhuTrach) {
    row.giao_vien_phu_trach = data.giaoVienPhuTrach;
    row.giao_vien_text = null;
  } else if (data.giaoVienText) {
    row.giao_vien_text = data.giaoVienText;
    row.giao_vien_phu_trach = null;
  }

  return row;
}

async function writeLopRow(
  mode: "insert" | "update",
  khoaId: string,
  lopId: string | null,
  row: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  if (mode === "insert") {
    const insertRow: Record<string, unknown> = { id_khoa_hoc: khoaId, ...row };
    const { error } = await admin.from("org_lop_hoc").insert(insertRow);
    if (error?.message?.includes("lich_hoc")) {
      delete insertRow.lich_hoc;
      const { error: err2 } = await admin.from("org_lop_hoc").insert(insertRow);
      if (err2) return { ok: false, error: err2.message };
      return { ok: true };
    }
    if (error?.message?.includes("giao_vien_text")) {
      delete insertRow.giao_vien_text;
      const { error: err2 } = await admin.from("org_lop_hoc").insert(insertRow);
      if (err2) return { ok: false, error: err2.message };
      return { ok: true };
    }
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await admin
    .from("org_lop_hoc")
    .update(row)
    .eq("id", lopId!)
    .eq("id_khoa_hoc", khoaId);

  if (error?.message?.includes("lich_hoc")) {
    delete row.lich_hoc;
    const { error: err2 } = await admin
      .from("org_lop_hoc")
      .update(row)
      .eq("id", lopId!)
      .eq("id_khoa_hoc", khoaId);
    if (err2) return { ok: false, error: err2.message };
    return { ok: true };
  }
  if (error?.message?.includes("giao_vien_text")) {
    delete row.giao_vien_text;
    const { error: err2 } = await admin
      .from("org_lop_hoc")
      .update(row)
      .eq("id", lopId!)
      .eq("id_khoa_hoc", khoaId);
    if (err2) return { ok: false, error: err2.message };
    return { ok: true };
  }
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function assertGiaoVienUser(
  userId: string | null | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!userId) return { ok: true };
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("id", userId)
    .maybeSingle<{ id: string }>();
  if (!data?.id) {
    return { ok: false, error: "Không tìm thấy tài khoản giảng viên." };
  }
  return { ok: true };
}

export async function taoLopHoc(
  orgId: string,
  khoaId: string,
  actorId: string,
  input: LopHocFormInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await canViewerManageKhoaHoc(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền thêm lớp học." };
  }

  const khoa = await fetchKhoaContext(orgId, khoaId);
  if (!khoa) {
    return { ok: false, error: "Không tìm thấy khóa học." };
  }

  const validated = validateLopInput(khoa, input);
  if (!validated.ok) return validated;

  const { data } = validated;
  const gvCheck = await assertGiaoVienUser(data.giaoVienPhuTrach);
  if (!gvCheck.ok) return gvCheck;

  const row = buildLopRow(khoa, {
    hinhThuc: data.hinhThuc,
    trangThaiLop: data.trangThaiLop,
    ngayKhaiGiang: data.ngayKhaiGiang!,
    lichHoc: data.lichHoc ?? null,
    giaoVienPhuTrach: data.giaoVienPhuTrach ?? null,
    giaoVienText: data.giaoVienText ?? null,
    slotToiDa: data.slotToiDa,
    maLop: resolveMaLop(
      khoa.tenKhoaHoc,
      data.ngayKhaiGiang!,
      data.maLop,
    ),
  });

  return writeLopRow("insert", khoaId, null, row);
}

export async function capNhatLopHoc(
  orgId: string,
  khoaId: string,
  lopId: string,
  actorId: string,
  input: LopHocFormInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await canViewerManageKhoaHoc(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền sửa lớp học." };
  }

  const khoa = await fetchKhoaContext(orgId, khoaId);
  if (!khoa) {
    return { ok: false, error: "Không tìm thấy khóa học." };
  }

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("org_lop_hoc")
    .select("id, ma_lop")
    .eq("id", lopId)
    .eq("id_khoa_hoc", khoaId)
    .maybeSingle();
  if (!existing?.id) {
    return { ok: false, error: "Không tìm thấy lớp học." };
  }

  const validated = validateLopInput(khoa, input);
  if (!validated.ok) return validated;

  const { data } = validated;
  const gvCheck = await assertGiaoVienUser(data.giaoVienPhuTrach);
  if (!gvCheck.ok) return gvCheck;

  const row = buildLopRow(
    khoa,
    {
      hinhThuc: data.hinhThuc,
      trangThaiLop: data.trangThaiLop,
      ngayKhaiGiang: data.ngayKhaiGiang!,
      lichHoc: data.lichHoc ?? null,
      giaoVienPhuTrach: data.giaoVienPhuTrach ?? null,
      giaoVienText: data.giaoVienText ?? null,
      slotToiDa: data.slotToiDa,
      maLop: data.maLop
        ? resolveMaLop(khoa.tenKhoaHoc, data.ngayKhaiGiang!, data.maLop)
        : null,
    },
    existing.ma_lop as string,
  );

  return writeLopRow("update", khoaId, lopId, row);
}
