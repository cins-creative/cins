import "server-only";

import { ensureLopChatPhong } from "@/lib/co-so/lop-chat-phong";
import { slugifyOrgName } from "@/lib/cong-dong/org-slug";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { normalizeChiNhanhIds } from "@/lib/to-chuc/khoa-hoc-meta-blocks";

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

function needsDiaChi(hinhThuc: HinhThucLop): boolean {
  return hinhThuc === "truc_tiep" || hinhThuc === "ket_hop";
}

function buildMaLop(tenKhoa: string, ngayIso: string): string {
  const slugPart = slugifyOrgName(tenKhoa).slice(0, 24) || "lop";
  const datePart = ngayIso.replace(/-/g, "");
  if (!datePart) {
    return `${slugPart}-${Date.now().toString(36)}`.slice(0, 48);
  }
  return `${slugPart}-${datePart}`.slice(0, 48);
}

function resolveNgayKhaiGiang(
  _loaiMoHinh: LoaiMoHinhKhoa,
  ngayKhaiGiang: string | null | undefined,
): string | null {
  const t = ngayKhaiGiang?.trim();
  return t || null;
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
):
  | {
      ok: true;
      data: Required<Pick<LopHocFormInput, "hinhThuc" | "trangThaiLop">> &
        LopHocFormInput & { chiNhanhIds: string[] };
    }
  | { ok: false; error: string } {
  const hinhThuc = input.hinhThuc ?? "truc_tiep";
  if (!HINH_THUC_SET.has(hinhThuc)) {
    return { ok: false, error: "Hình thức lớp không hợp lệ." };
  }

  const trangThaiLop = input.trangThaiLop ?? "sap_khai_giang";
  if (!TRANG_THAI_LOP_SET.has(trangThaiLop)) {
    return { ok: false, error: "Trạng thái lớp không hợp lệ." };
  }

  const ngay = resolveNgayKhaiGiang(khoa.loaiMoHinh, input.ngayKhaiGiang);

  if (
    input.slotToiDa != null &&
    (!Number.isInteger(input.slotToiDa) || input.slotToiDa < 1)
  ) {
    return { ok: false, error: "Sĩ số tối đa phải là số nguyên dương." };
  }

  const chiNhanhIds = needsDiaChi(hinhThuc)
    ? normalizeChiNhanhIds(input.chiNhanhIds)
    : [];
  if (needsDiaChi(hinhThuc) && chiNhanhIds.length === 0) {
    return {
      ok: false,
      error: "Học offline / kết hợp cần chọn ít nhất một chi nhánh.",
    };
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
      chiNhanhIds,
    },
  };
}

/** Xác nhận mọi chi nhánh thuộc đúng org của khóa. */
async function assertChiNhanhBelongToOrg(
  orgId: string,
  chiNhanhIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!chiNhanhIds.length) return { ok: true };
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_chi_nhanh")
    .select("id")
    .eq("id_to_chuc", orgId)
    .in("id", chiNhanhIds);
  if (error) {
    return { ok: false, error: "Không kiểm tra được chi nhánh." };
  }
  const found = new Set((data ?? []).map((r) => r.id as string));
  if (chiNhanhIds.some((id) => !found.has(id))) {
    return { ok: false, error: "Chi nhánh không thuộc cơ sở này." };
  }
  return { ok: true };
}

/**
 * Đồng bộ junction + cột chính `id_chi_nhanh`.
 * Nuốt lỗi nếu bảng junction chưa migrate (dev cũ).
 */
async function syncLopChiNhanh(
  lopId: string,
  chiNhanhIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const primary = chiNhanhIds[0] ?? null;

  const { error: primaryErr } = await admin
    .from("org_lop_hoc")
    .update({ id_chi_nhanh: primary })
    .eq("id", lopId);
  if (primaryErr && !primaryErr.message.includes("id_chi_nhanh")) {
    return { ok: false, error: primaryErr.message };
  }

  const { error: delErr } = await admin
    .from("org_lop_hoc_chi_nhanh")
    .delete()
    .eq("id_lop_hoc", lopId);
  if (delErr) {
    if (
      delErr.message.includes("org_lop_hoc_chi_nhanh") ||
      delErr.message.includes("does not exist") ||
      delErr.code === "42P01"
    ) {
      return { ok: true };
    }
    return { ok: false, error: delErr.message };
  }

  if (!chiNhanhIds.length) return { ok: true };

  const rows = chiNhanhIds.map((idChiNhanh, i) => ({
    id_lop_hoc: lopId,
    id_chi_nhanh: idChiNhanh,
    thu_tu: i,
  }));
  const { error: insErr } = await admin
    .from("org_lop_hoc_chi_nhanh")
    .insert(rows);
  if (insErr) {
    if (
      insErr.message.includes("org_lop_hoc_chi_nhanh") ||
      insErr.message.includes("does not exist") ||
      insErr.code === "42P01"
    ) {
      return { ok: true };
    }
    return { ok: false, error: insErr.message };
  }
  return { ok: true };
}

function buildLopRow(
  khoa: KhoaContext,
  data: LopHocFormInput & {
    hinhThuc: HinhThucLop;
    trangThaiLop: TrangThaiLop;
    ngayKhaiGiang: string | null;
    lichHoc: string | null;
    giaoVienPhuTrach: string | null;
    giaoVienText: string | null;
    maLop: string | null;
    chiNhanhIds: string[];
  },
  existingMaLop?: string | null,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    hinh_thuc: data.hinhThuc,
    ngay_khai_giang: data.ngayKhaiGiang,
    trang_thai: data.trangThaiLop,
    id_chi_nhanh: data.chiNhanhIds[0] ?? null,
  };

  if (data.lichHoc !== undefined) row.lich_hoc = data.lichHoc;
  if (data.slotToiDa != null) row.slot_toi_da = data.slotToiDa;

  const maLop = data.maLop
    ? data.maLop.slice(0, 48)
    : (existingMaLop ??
      buildMaLop(khoa.tenKhoaHoc, data.ngayKhaiGiang ?? ""));
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

function isMissingColumnError(
  error: { message?: string; code?: string } | null | undefined,
  column: string,
): boolean {
  if (!error) return false;
  const msg = error.message ?? "";
  if (error.code === "42703") return msg.includes(column);
  return (
    msg.includes(column) &&
    (msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      msg.includes("Could not find"))
  );
}

async function writeLopRow(
  mode: "insert" | "update",
  khoaId: string,
  lopId: string | null,
  row: Record<string, unknown>,
): Promise<{ ok: true; lopId: string } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  if (mode === "insert") {
    const insertRow: Record<string, unknown> = { id_khoa_hoc: khoaId, ...row };
    const tryInsert = async (payload: Record<string, unknown>) =>
      admin
        .from("org_lop_hoc")
        .insert(payload)
        .select("id")
        .single<{ id: string }>();

    let { data, error } = await tryInsert(insertRow);
    if (isMissingColumnError(error, "lich_hoc")) {
      delete insertRow.lich_hoc;
      ({ data, error } = await tryInsert(insertRow));
    }
    if (isMissingColumnError(error, "giao_vien_text")) {
      delete insertRow.giao_vien_text;
      ({ data, error } = await tryInsert(insertRow));
    }
    if (isMissingColumnError(error, "id_chi_nhanh")) {
      delete insertRow.id_chi_nhanh;
      ({ data, error } = await tryInsert(insertRow));
    }
    if (error || !data?.id) {
      return { ok: false, error: error?.message ?? "Không tạo được lớp." };
    }
    return { ok: true, lopId: data.id };
  }

  const { error } = await admin
    .from("org_lop_hoc")
    .update(row)
    .eq("id", lopId!)
    .eq("id_khoa_hoc", khoaId);

  if (isMissingColumnError(error, "lich_hoc")) {
    delete row.lich_hoc;
    const { error: err2 } = await admin
      .from("org_lop_hoc")
      .update(row)
      .eq("id", lopId!)
      .eq("id_khoa_hoc", khoaId);
    if (err2) return { ok: false, error: err2.message };
    return { ok: true, lopId: lopId! };
  }
  if (isMissingColumnError(error, "giao_vien_text")) {
    delete row.giao_vien_text;
    const { error: err2 } = await admin
      .from("org_lop_hoc")
      .update(row)
      .eq("id", lopId!)
      .eq("id_khoa_hoc", khoaId);
    if (err2) return { ok: false, error: err2.message };
    return { ok: true, lopId: lopId! };
  }
  if (isMissingColumnError(error, "id_chi_nhanh")) {
    delete row.id_chi_nhanh;
    const { error: err2 } = await admin
      .from("org_lop_hoc")
      .update(row)
      .eq("id", lopId!)
      .eq("id_khoa_hoc", khoaId);
    if (err2) return { ok: false, error: err2.message };
    return { ok: true, lopId: lopId! };
  }
  if (error) return { ok: false, error: error.message };
  return { ok: true, lopId: lopId! };
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
): Promise<{ ok: true; lopId: string } | { ok: false; error: string }> {
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

  const cnCheck = await assertChiNhanhBelongToOrg(orgId, data.chiNhanhIds);
  if (!cnCheck.ok) return cnCheck;

  const row = buildLopRow(khoa, {
    hinhThuc: data.hinhThuc,
    trangThaiLop: data.trangThaiLop,
    ngayKhaiGiang: data.ngayKhaiGiang ?? null,
    lichHoc: data.lichHoc ?? null,
    giaoVienPhuTrach: data.giaoVienPhuTrach ?? null,
    giaoVienText: data.giaoVienText ?? null,
    slotToiDa: data.slotToiDa,
    maLop: resolveMaLop(
      khoa.tenKhoaHoc,
      data.ngayKhaiGiang ?? "",
      data.maLop,
    ),
    chiNhanhIds: data.chiNhanhIds,
  });

  const written = await writeLopRow("insert", khoaId, null, row);
  if (!written.ok) return written;

  const sync = await syncLopChiNhanh(written.lopId, data.chiNhanhIds);
  if (!sync.ok) return sync;

  await ensureLopChatPhong({
    orgId,
    lopId: written.lopId,
    tenPhong: `${khoa.tenKhoaHoc} · ${String(row.ma_lop ?? "")}`.trim(),
    giaoVienUserId: data.giaoVienPhuTrach ?? null,
  });

  return { ok: true, lopId: written.lopId };
}

export async function capNhatLopHoc(
  orgId: string,
  khoaId: string,
  lopId: string,
  actorId: string,
  input: LopHocFormInput,
): Promise<{ ok: true; lopId: string } | { ok: false; error: string }> {
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

  const cnCheck = await assertChiNhanhBelongToOrg(orgId, data.chiNhanhIds);
  if (!cnCheck.ok) return cnCheck;

  const row = buildLopRow(
    khoa,
    {
      hinhThuc: data.hinhThuc,
      trangThaiLop: data.trangThaiLop,
      ngayKhaiGiang: data.ngayKhaiGiang ?? null,
      lichHoc: data.lichHoc ?? null,
      giaoVienPhuTrach: data.giaoVienPhuTrach ?? null,
      giaoVienText: data.giaoVienText ?? null,
      slotToiDa: data.slotToiDa,
      maLop: data.maLop
        ? resolveMaLop(
            khoa.tenKhoaHoc,
            data.ngayKhaiGiang ?? "",
            data.maLop,
          )
        : null,
      chiNhanhIds: data.chiNhanhIds,
    },
    existing.ma_lop as string,
  );

  const written = await writeLopRow("update", khoaId, lopId, row);
  if (!written.ok) return written;

  const sync = await syncLopChiNhanh(lopId, data.chiNhanhIds);
  if (!sync.ok) return sync;

  await ensureLopChatPhong({
    orgId,
    lopId,
    tenPhong: `${khoa.tenKhoaHoc} · ${(existing.ma_lop as string) ?? ""}`.trim(),
    giaoVienUserId: data.giaoVienPhuTrach ?? null,
  });

  return { ok: true, lopId };
}

/** Soft delete lớp — đặt `trang_thai = huy`, giữ row + lịch sử. */
export async function softDeleteLopHoc(
  orgId: string,
  khoaId: string,
  lopId: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await canViewerManageKhoaHoc(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền xóa lớp học." };
  }

  const khoa = await fetchKhoaContext(orgId, khoaId);
  if (!khoa) {
    return { ok: false, error: "Không tìm thấy khóa học." };
  }

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("org_lop_hoc")
    .select("id, trang_thai")
    .eq("id", lopId)
    .eq("id_khoa_hoc", khoaId)
    .maybeSingle();
  if (!existing?.id) {
    return { ok: false, error: "Không tìm thấy lớp học." };
  }

  if (existing.trang_thai === "huy") {
    return { ok: true };
  }

  const { error } = await admin
    .from("org_lop_hoc")
    .update({ trang_thai: "huy" })
    .eq("id", lopId)
    .eq("id_khoa_hoc", khoaId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export { xoaLopHoc, kiemTraXoaLopHoc } from "./khoa-lop-xoa";
