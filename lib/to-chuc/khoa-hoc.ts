import "server-only";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { slugifyOrgName } from "@/lib/cong-dong/org-slug";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

import { getViewerCoSoVaiTro } from "./co-so-membership";
import { canManageKhoaHoc } from "./co-so-vai-tro";
import {
  buildKhoaHocNoiDungBlocks,
  parseKhoaHocNoiDungBlocks,
} from "./khoa-hoc-meta-blocks";
import { deriveLegacyFieldsFromGoiHocPhi } from "./khoa-hoc-goi-phi";
import { isScaffoldLopDbRow, type ScaffoldLopDbRow } from "./khoa-hoc-labels";
import type {
  CapNhatKhoaHocInput,
  GoiHocPhiKhoa,
  HinhThucLop,
  KhoaHocCardData,
  KhoaHocCheDoHienThi,
  LoaiMoHinhKhoa,
  TaoKhoaHocInput,
  TrinhDoDauVao,
  TrangThaiKhoaHoc,
} from "./khoa-hoc-types";

type KhoaHocRow = {
  id: string;
  slug: string;
  ten_khoa_hoc: string;
  mo_ta: string | null;
  loai_mo_hinh: LoaiMoHinhKhoa;
  trinh_do_dau_vao: TrinhDoDauVao;
  trang_thai_khoa_hoc: TrangThaiKhoaHoc;
  thoi_luong_buoi: number | null;
  thoi_luong_phut_moi_buoi: number | null;
  hoc_phi: number | null;
  avatar_id: string | null;
  cover_id: string | null;
  noi_dung_blocks?: unknown;
};

const KHOA_HOC_CARD_SELECT =
  "id, slug, ten_khoa_hoc, mo_ta, loai_mo_hinh, trinh_do_dau_vao, trang_thai_khoa_hoc, thoi_luong_buoi, thoi_luong_phut_moi_buoi, hoc_phi, avatar_id, cover_id, noi_dung_blocks";

const KHOA_HOC_CARD_SELECT_NO_BLOCKS =
  "id, slug, ten_khoa_hoc, mo_ta, loai_mo_hinh, trinh_do_dau_vao, trang_thai_khoa_hoc, thoi_luong_buoi, thoi_luong_phut_moi_buoi, hoc_phi, avatar_id, cover_id";

type LopMetaRow = {
  id: string;
  id_khoa_hoc: string;
  hinh_thuc: HinhThucLop;
  ngay_khai_giang: string;
  lich_hoc: string | null;
};

type LopMeta = {
  lopId: string | null;
  hinhThuc: HinhThucLop | null;
  lichHoc: string | null;
};

const HINH_THUC_SET = new Set<string>(["truc_tiep", "truc_tuyen", "ket_hop"]);

const LOAI_MO_HINH_SET = new Set<string>(["cohort_co_dinh", "lien_tuc_theo_thang"]);
const TRINH_DO_SET = new Set<string>([
  "co_ban",
  "trung_cap",
  "nang_cao",
  "khong_yeu_cau",
]);
const TRANG_THAI_SET = new Set<string>([
  "sap_khai_giang",
  "dang_mo_don",
  "dang_hoc",
  "da_ket_thuc",
  "tam_dung",
]);
const CHE_DO_HIEN_THI_SET = new Set<string>(["cong_khai", "an"]);

export async function canViewerManageKhoaHoc(
  profileId: string | null | undefined,
  orgId: string,
): Promise<boolean> {
  // Quyền CINs (trục 1) mở khoá vận hành mọi org — độc lập membership.
  if (await getCurrentUserIsCinsAdmin()) return true;
  if (!profileId) return false;
  const vaiTro = await getViewerCoSoVaiTro(profileId, orgId);
  return canManageKhoaHoc(vaiTro);
}

async function assertCoSoOrg(orgId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .eq("loai_to_chuc", "co_so_dao_tao")
    .maybeSingle();
  return Boolean(data?.id);
}

export async function uniqueKhoaSlugTrongOrg(
  orgId: string,
  baseSlug: string,
): Promise<string> {
  const admin = createServiceRoleClient();
  let candidate = baseSlug.slice(0, 72) || "khoa-hoc";
  let n = 2;
  while (n < 100) {
    const { data } = await admin
      .from("org_khoa_hoc")
      .select("id")
      .eq("id_to_chuc", orgId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    const suffix = `-${n}`;
    candidate = `${baseSlug.slice(0, 72 - suffix.length)}${suffix}`;
    n += 1;
  }
  return `${baseSlug.slice(0, 56)}-${Date.now().toString(36)}`;
}

type KhoaDanXuat = {
  soLopMo: number;
  soHocVien: number;
  ngayKhaiGiangGanNhat: string | null;
};

async function demDanXuatKhoa(
  khoaIds: string[],
): Promise<Map<string, KhoaDanXuat>> {
  const map = new Map<string, KhoaDanXuat>();
  for (const id of khoaIds) {
    map.set(id, { soLopMo: 0, soHocVien: 0, ngayKhaiGiangGanNhat: null });
  }
  if (!khoaIds.length) return map;

  const admin = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  const [lopRes, hvRes] = await Promise.all([
    admin
      .from("org_lop_hoc")
      .select(
        "id_khoa_hoc, ngay_khai_giang, ma_lop, giao_vien_phu_trach, giao_vien_text",
      )
      .in("id_khoa_hoc", khoaIds)
      .in("trang_thai", ["sap_khai_giang", "dang_hoc"])
      .order("ngay_khai_giang", { ascending: true }),
    admin
      .from("user_hoc_vien_lop")
      .select("id_khoa_hoc, id_nguoi_dung")
      .in("id_khoa_hoc", khoaIds)
      .in("trang_thai", ["da_dang_ky", "dang_hoc"]),
  ]);

  let lopRows = lopRes.data ?? [];
  if (lopRes.error?.message?.includes("giao_vien_text")) {
    const fallback = await admin
      .from("org_lop_hoc")
      .select("id_khoa_hoc, ngay_khai_giang, ma_lop, giao_vien_phu_trach")
      .in("id_khoa_hoc", khoaIds)
      .in("trang_thai", ["sap_khai_giang", "dang_hoc"])
      .order("ngay_khai_giang", { ascending: true });
    lopRows = fallback.data ?? [];
  }

  const hvRows = hvRes.data ?? [];

  const visibleLopRows = lopRows.filter((row) => !isScaffoldLopDbRow(row));

  for (const row of visibleLopRows) {
    const khoaId = row.id_khoa_hoc as string;
    const entry = map.get(khoaId);
    if (!entry) continue;
    entry.soLopMo += 1;
  }

  const ngayByKhoa = new Map<
    string,
    { future: string | null; earliest: string | null }
  >();
  for (const row of visibleLopRows) {
    const khoaId = row.id_khoa_hoc as string;
    const ngay = row.ngay_khai_giang as string | null;
    if (!ngay) continue;
    let bag = ngayByKhoa.get(khoaId);
    if (!bag) {
      bag = { future: null, earliest: null };
      ngayByKhoa.set(khoaId, bag);
    }
    if (!bag.earliest || ngay < bag.earliest) bag.earliest = ngay;
    if (ngay >= today && (!bag.future || ngay < bag.future)) bag.future = ngay;
  }
  for (const [khoaId, bag] of ngayByKhoa) {
    const entry = map.get(khoaId);
    if (entry) entry.ngayKhaiGiangGanNhat = bag.future ?? bag.earliest;
  }

  const usersByKhoa = new Map<string, Set<string>>();
  for (const row of hvRows) {
    const khoaId = row.id_khoa_hoc as string;
    const userId = row.id_nguoi_dung as string;
    if (!usersByKhoa.has(khoaId)) usersByKhoa.set(khoaId, new Set());
    usersByKhoa.get(khoaId)!.add(userId);
  }
  for (const [khoaId, users] of usersByKhoa) {
    const entry = map.get(khoaId);
    if (entry) entry.soHocVien = users.size;
  }

  return map;
}

async function fetchLopMetaForKhoa(
  khoaIds: string[],
): Promise<Map<string, LopMeta>> {
  const map = new Map<string, LopMeta>();
  for (const id of khoaIds) {
    map.set(id, { lopId: null, hinhThuc: null, lichHoc: null });
  }
  if (!khoaIds.length) return map;

  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from("org_lop_hoc")
    .select("id, id_khoa_hoc, hinh_thuc, ngay_khai_giang, lich_hoc")
    .in("id_khoa_hoc", khoaIds)
    .order("ngay_khai_giang", { ascending: true });

  const lopRows = error?.message?.includes("lich_hoc")
    ? (
        await admin
          .from("org_lop_hoc")
          .select("id, id_khoa_hoc, hinh_thuc, ngay_khai_giang")
          .in("id_khoa_hoc", khoaIds)
          .order("ngay_khai_giang", { ascending: true })
      ).data
    : rows;

  for (const row of (lopRows ?? []) as LopMetaRow[]) {
    const khoaId = row.id_khoa_hoc;
    if (map.get(khoaId)?.lopId) continue;
    map.set(khoaId, {
      lopId: row.id,
      hinhThuc: row.hinh_thuc,
      lichHoc: row.lich_hoc,
    });
  }
  return map;
}

function needsDiaChi(hinhThuc: HinhThucLop): boolean {
  return hinhThuc === "truc_tiep" || hinhThuc === "ket_hop";
}

function defaultNgayKhaiGiang(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildMaLop(tenKhoa: string, ngayIso: string): string {
  const slugPart = slugifyOrgName(tenKhoa).slice(0, 24) || "lop";
  const datePart = ngayIso.replace(/-/g, "");
  return `${slugPart}-${datePart}`.slice(0, 48);
}

function resolveNgayKhaiGiang(
  loaiMoHinh: LoaiMoHinhKhoa,
  ngayKhaiGiang: string | null | undefined,
): string {
  if (loaiMoHinh === "cohort_co_dinh") {
    return ngayKhaiGiang?.trim() ?? "";
  }
  return ngayKhaiGiang?.trim() || defaultNgayKhaiGiang();
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

async function upsertLopDauTien(
  khoaId: string,
  tenKhoa: string,
  loaiMoHinh: LoaiMoHinhKhoa,
  input: {
    lopId?: string | null;
    ngayKhaiGiang?: string | null;
    hinhThuc?: HinhThucLop;
    lichHoc?: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const hinhThuc = input.hinhThuc ?? "truc_tiep";
  const ngay = resolveNgayKhaiGiang(loaiMoHinh, input.ngayKhaiGiang);
  if (!ngay) {
    return { ok: false, error: "Ngày khai giảng không được trống (cohort)." };
  }
  const lichHoc = resolveLichHoc(loaiMoHinh, input.lichHoc);
  const admin = createServiceRoleClient();

  const lopRow: Record<string, unknown> = {
    hinh_thuc: hinhThuc,
    ngay_khai_giang: ngay,
    trang_thai: "sap_khai_giang",
  };
  if (lichHoc != null) lopRow.lich_hoc = lichHoc;

  if (input.lopId) {
    const { error } = await admin
      .from("org_lop_hoc")
      .update(lopRow)
      .eq("id", input.lopId)
      .eq("id_khoa_hoc", khoaId);
    if (error?.message?.includes("lich_hoc")) {
      delete lopRow.lich_hoc;
      const { error: err2 } = await admin
        .from("org_lop_hoc")
        .update(lopRow)
        .eq("id", input.lopId)
        .eq("id_khoa_hoc", khoaId);
      if (err2) return { ok: false, error: err2.message };
      return { ok: true };
    }
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const insertRow: Record<string, unknown> = {
    id_khoa_hoc: khoaId,
    ma_lop: buildMaLop(tenKhoa, ngay),
    ...lopRow,
  };
  const { error } = await admin.from("org_lop_hoc").insert(insertRow);
  if (error?.message?.includes("lich_hoc")) {
    delete insertRow.lich_hoc;
    const { error: err2 } = await admin.from("org_lop_hoc").insert(insertRow);
    if (err2) return { ok: false, error: err2.message };
    return { ok: true };
  }
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function mapRowToCard(
  row: KhoaHocRow,
  stats: KhoaDanXuat,
  lopMeta: LopMeta,
  index: number,
): KhoaHocCardData {
  const parsed = parseKhoaHocNoiDungBlocks(row.noi_dung_blocks);
  const thumbnailUrl =
    resolveTruongImageSrcSync(row.avatar_id, ["public", "avatar", "medium"]) ??
    null;
  const coverUrl =
    resolveTruongImageSrcSync(row.cover_id, ["public", "cover", "medium"]) ??
    null;
  return {
    id: row.id,
    slug: row.slug,
    tenKhoaHoc: row.ten_khoa_hoc,
    moTa: row.mo_ta,
    loaiMoHinh: row.loai_mo_hinh,
    trinhDoDauVao: row.trinh_do_dau_vao,
    trangThaiKhoaHoc: row.trang_thai_khoa_hoc,
    cheDoHienThi: parsed.cheDoHienThi,
    thoiLuongBuoi: row.thoi_luong_buoi,
    thoiLuongPhutMoiBuoi: row.thoi_luong_phut_moi_buoi,
    hocPhi: row.hoc_phi != null ? Number(row.hoc_phi) : null,
    goiHocPhi: parsed.goiHocPhi,
    thumbnailId: row.avatar_id,
    thumbnailUrl,
    coverId: row.cover_id,
    coverUrl,
    soLopMo: stats.soLopMo,
    soHocVien: stats.soHocVien,
    ngayKhaiGiangGanNhat: stats.ngayKhaiGiangGanNhat,
    coverVariant: index % 3,
    lopId: lopMeta.lopId,
    hinhThuc: lopMeta.hinhThuc,
    lichHoc: lopMeta.lichHoc,
    diaChiHoc: parsed.diaChiHoc,
    yeuCauChuanBi: parsed.yeuCauChuanBi,
  };
}

export async function listKhoaHocCuaOrg(
  orgId: string,
  opts?: { includeHidden?: boolean },
): Promise<
  { ok: true; khoaHoc: KhoaHocCardData[] } | { ok: false; error: string }
> {
  if (!(await assertCoSoOrg(orgId))) {
    return { ok: false, error: "Không tìm thấy cơ sở đào tạo." };
  }

  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from("org_khoa_hoc")
    .select(KHOA_HOC_CARD_SELECT)
    .eq("id_to_chuc", orgId)
    .order("ten_khoa_hoc", { ascending: true });

  if (error) {
    if (error.message.includes("noi_dung_blocks")) {
      const fallback = await admin
        .from("org_khoa_hoc")
        .select(KHOA_HOC_CARD_SELECT_NO_BLOCKS)
        .eq("id_to_chuc", orgId)
        .order("ten_khoa_hoc", { ascending: true });
      if (fallback.error) {
        return { ok: false, error: fallback.error.message };
      }
      const listFallback = (fallback.data ?? []) as KhoaHocRow[];
      const statsMap = await demDanXuatKhoa(listFallback.map((r) => r.id));
      const lopMap = await fetchLopMetaForKhoa(listFallback.map((r) => r.id));
      const khoaHoc = listFallback
        .map((row, index) =>
          mapRowToCard(
            row,
            statsMap.get(row.id) ?? {
              soLopMo: 0,
              soHocVien: 0,
              ngayKhaiGiangGanNhat: null,
            },
            lopMap.get(row.id) ?? {
              lopId: null,
              hinhThuc: null,
              lichHoc: null,
            },
            index,
          ),
        )
        .filter((k) => opts?.includeHidden || k.cheDoHienThi !== "an");
      return { ok: true, khoaHoc };
    }
    return { ok: false, error: error.message };
  }

  const list = (rows ?? []) as KhoaHocRow[];
  const statsMap = await demDanXuatKhoa(list.map((r) => r.id));
  const lopMap = await fetchLopMetaForKhoa(list.map((r) => r.id));
  const khoaHoc = list
    .map((row, index) =>
      mapRowToCard(
        row,
        statsMap.get(row.id) ?? {
          soLopMo: 0,
          soHocVien: 0,
          ngayKhaiGiangGanNhat: null,
        },
        lopMap.get(row.id) ?? { lopId: null, hinhThuc: null, lichHoc: null },
        index,
      ),
    )
    .filter((k) => opts?.includeHidden || k.cheDoHienThi !== "an");

  return { ok: true, khoaHoc };
}

function validateGoiHocPhi(
  goiHocPhi: ReadonlyArray<GoiHocPhiKhoa> | undefined,
): string | null {
  if (!goiHocPhi?.length) return null;
  for (const goi of goiHocPhi) {
    if (!goi.tenGoi.trim()) {
      return "Mỗi gói học phí cần tên gói.";
    }
    if (goi.hocPhi < 0) return "Học phí gói phải ≥ 0.";
    if (goi.soBuoi != null && goi.soBuoi < 0) {
      return "Số buổi gói phải ≥ 0.";
    }
    if (goi.phutMoiBuoi != null && goi.phutMoiBuoi < 0) {
      return "Phút/buổi gói phải ≥ 0.";
    }
  }
  return null;
}

function mergeInputWithGoiHocPhi(input: TaoKhoaHocInput): TaoKhoaHocInput {
  const goi = input.goiHocPhi?.length ? input.goiHocPhi : undefined;
  if (!goi?.length) return input;
  const legacy = deriveLegacyFieldsFromGoiHocPhi(goi);
  return {
    ...input,
    goiHocPhi: goi,
    hocPhi: legacy.hocPhi,
    thoiLuongBuoi: legacy.thoiLuongBuoi,
    thoiLuongPhutMoiBuoi: legacy.thoiLuongPhutMoiBuoi,
  };
}

function validateTaoInput(
  input: TaoKhoaHocInput,
): { ok: true; data: TaoKhoaHocInput } | { ok: false; error: string } {
  const ten = input.tenKhoaHoc?.trim() ?? "";
  if (!ten) {
    return { ok: false, error: "Tên khóa học không được trống." };
  }
  if (!LOAI_MO_HINH_SET.has(input.loaiMoHinh)) {
    return { ok: false, error: "Mô hình khóa học không hợp lệ." };
  }
  const trinhDo = input.trinhDoDauVao ?? "khong_yeu_cau";
  if (!TRINH_DO_SET.has(trinhDo)) {
    return { ok: false, error: "Trình độ đầu vào không hợp lệ." };
  }
  for (const [label, val] of [
    ["Số buổi", input.thoiLuongBuoi],
    ["Phút/buổi", input.thoiLuongPhutMoiBuoi],
    ["Học phí", input.hocPhi],
  ] as const) {
    if (val != null && val < 0) {
      return { ok: false, error: `${label} phải ≥ 0.` };
    }
  }
  const hinhThuc = input.hinhThuc ?? "truc_tiep";
  if (!HINH_THUC_SET.has(hinhThuc)) {
    return { ok: false, error: "Hình thức học không hợp lệ." };
  }
  if (input.loaiMoHinh === "cohort_co_dinh" && !input.ngayKhaiGiang?.trim()) {
    return { ok: false, error: "Theo khóa cần ngày khai giảng." };
  }
  if (needsDiaChi(hinhThuc) && !input.diaChiHoc?.trim()) {
    return {
      ok: false,
      error: "Học offline / kết hợp cần địa chỉ phòng học.",
    };
  }
  const cheDoHienThi: KhoaHocCheDoHienThi =
    input.cheDoHienThi === "an" ? "an" : "cong_khai";
  const goiErr = validateGoiHocPhi(input.goiHocPhi);
  if (goiErr) return { ok: false, error: goiErr };
  const merged = mergeInputWithGoiHocPhi({
    ...input,
    tenKhoaHoc: ten,
    trinhDoDauVao: trinhDo,
    moTa: input.moTa?.trim() || null,
    hinhThuc,
    ngayKhaiGiang: input.ngayKhaiGiang?.trim() || null,
    diaChiHoc: input.diaChiHoc?.trim() || null,
    lichHoc: input.lichHoc?.trim() || null,
    yeuCauChuanBi: input.yeuCauChuanBi?.trim() || null,
    cheDoHienThi,
  });
  return { ok: true, data: merged };
}

export async function taoKhoaHoc(
  orgId: string,
  actorId: string,
  input: TaoKhoaHocInput,
): Promise<
  { ok: true; khoaHoc: KhoaHocCardData } | { ok: false; error: string }
> {
  if (!(await canViewerManageKhoaHoc(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền tạo khóa học." };
  }
  if (!(await assertCoSoOrg(orgId))) {
    return { ok: false, error: "Không tìm thấy cơ sở đào tạo." };
  }

  const validated = validateTaoInput(input);
  if (!validated.ok) return validated;

  const data = validated.data;
  const baseSlug = slugifyOrgName(data.tenKhoaHoc);
  const slug = await uniqueKhoaSlugTrongOrg(orgId, baseSlug);
  const hinhThuc = data.hinhThuc ?? "truc_tiep";
  const noiDungBlocks = buildKhoaHocNoiDungBlocks({
    yeuCauChuanBi: data.yeuCauChuanBi,
    diaChiHoc: data.diaChiHoc,
    includeDiaDiem: needsDiaChi(hinhThuc),
    cheDoHienThi: data.cheDoHienThi,
    goiHocPhi: data.goiHocPhi,
  });

  const admin = createServiceRoleClient();
  const insertRow: Record<string, unknown> = {
    id_to_chuc: orgId,
    ten_khoa_hoc: data.tenKhoaHoc,
    slug,
    loai_mo_hinh: data.loaiMoHinh,
    mo_ta: data.moTa,
    thoi_luong_buoi: data.thoiLuongBuoi ?? null,
    thoi_luong_phut_moi_buoi: data.thoiLuongPhutMoiBuoi ?? null,
    hoc_phi: data.hocPhi ?? null,
    trinh_do_dau_vao: data.trinhDoDauVao ?? "khong_yeu_cau",
    trang_thai_khoa_hoc: "sap_khai_giang",
    avatar_id: data.thumbnailId?.trim() || null,
    cover_id: data.coverId?.trim() || null,
    noi_dung_blocks: noiDungBlocks,
  };

  let row: KhoaHocRow | null = null;
  const { data: inserted, error } = await admin
    .from("org_khoa_hoc")
    .insert(insertRow)
    .select(KHOA_HOC_CARD_SELECT)
    .single();

  if (error || !inserted) {
    const msg = error?.message ?? "Không tạo được khóa học.";
    if (msg.includes("noi_dung_blocks")) {
      delete insertRow.noi_dung_blocks;
      const { data: row2, error: err2 } = await admin
        .from("org_khoa_hoc")
        .insert(insertRow)
        .select(KHOA_HOC_CARD_SELECT_NO_BLOCKS)
        .single();
      if (err2 || !row2) {
        return { ok: false, error: err2?.message ?? msg };
      }
      row = row2 as KhoaHocRow;
    } else {
      return { ok: false, error: msg };
    }
  } else {
    row = inserted as KhoaHocRow;
  }

  const lopResult = await upsertLopDauTien(row.id, data.tenKhoaHoc, data.loaiMoHinh, {
    ngayKhaiGiang: data.ngayKhaiGiang,
    hinhThuc,
    lichHoc: data.lichHoc,
  });
  if (!lopResult.ok) {
    await admin.from("org_khoa_hoc").delete().eq("id", row.id);
    return lopResult;
  }

  const khoaHoc = await fetchKhoaHocCard(orgId, row.id, 0);
  if (!khoaHoc) {
    return { ok: false, error: "Không tải được khóa học sau khi tạo." };
  }
  return { ok: true, khoaHoc };
}

async function fetchKhoaHocCard(
  orgId: string,
  khoaId: string,
  coverVariant = 0,
): Promise<KhoaHocCardData | null> {
  const admin = createServiceRoleClient();
  let row: KhoaHocRow | null = null;
  const { data, error } = await admin
    .from("org_khoa_hoc")
    .select(KHOA_HOC_CARD_SELECT)
    .eq("id_to_chuc", orgId)
    .eq("id", khoaId)
    .maybeSingle();
  if (error?.message?.includes("noi_dung_blocks")) {
    const fallback = await admin
      .from("org_khoa_hoc")
      .select(KHOA_HOC_CARD_SELECT_NO_BLOCKS)
      .eq("id_to_chuc", orgId)
      .eq("id", khoaId)
      .maybeSingle();
    row = (fallback.data as KhoaHocRow | null) ?? null;
  } else {
    row = (data as KhoaHocRow | null) ?? null;
  }
  if (!row) return null;
  const statsMap = await demDanXuatKhoa([khoaId]);
  const lopMap = await fetchLopMetaForKhoa([khoaId]);
  return mapRowToCard(
    row,
    statsMap.get(khoaId) ?? {
      soLopMo: 0,
      soHocVien: 0,
      ngayKhaiGiangGanNhat: null,
    },
    lopMap.get(khoaId) ?? { lopId: null, hinhThuc: null, lichHoc: null },
    coverVariant,
  );
}

function validateCapNhatInput(
  input: CapNhatKhoaHocInput,
): { ok: true; data: CapNhatKhoaHocInput } | { ok: false; error: string } {
  const base = validateTaoInput(input);
  if (!base.ok) return base;
  if (
    input.trangThaiKhoaHoc != null &&
    !TRANG_THAI_SET.has(input.trangThaiKhoaHoc)
  ) {
    return { ok: false, error: "Trạng thái khóa học không hợp lệ." };
  }
  if (
    input.cheDoHienThi != null &&
    !CHE_DO_HIEN_THI_SET.has(input.cheDoHienThi)
  ) {
    return { ok: false, error: "Chế độ hiển thị không hợp lệ." };
  }
  return {
    ok: true,
    data: {
      ...base.data,
      trangThaiKhoaHoc: input.trangThaiKhoaHoc,
      cheDoHienThi: base.data.cheDoHienThi,
    },
  };
}

export async function capNhatKhoaHoc(
  orgId: string,
  khoaId: string,
  actorId: string,
  input: CapNhatKhoaHocInput,
  coverVariant = 0,
): Promise<
  { ok: true; khoaHoc: KhoaHocCardData } | { ok: false; error: string }
> {
  if (!(await canViewerManageKhoaHoc(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền sửa khóa học." };
  }
  if (!(await assertCoSoOrg(orgId))) {
    return { ok: false, error: "Không tìm thấy cơ sở đào tạo." };
  }

  const validated = validateCapNhatInput(input);
  if (!validated.ok) return validated;

  const data = validated.data;
  const hinhThuc = data.hinhThuc ?? "truc_tiep";
  const admin = createServiceRoleClient();
  const updateRow: Record<string, unknown> = {
    ten_khoa_hoc: data.tenKhoaHoc,
    loai_mo_hinh: data.loaiMoHinh,
    mo_ta: data.moTa,
    thoi_luong_buoi: data.thoiLuongBuoi ?? null,
    thoi_luong_phut_moi_buoi: data.thoiLuongPhutMoiBuoi ?? null,
    hoc_phi: data.hocPhi ?? null,
    trinh_do_dau_vao: data.trinhDoDauVao ?? "khong_yeu_cau",
    avatar_id: data.thumbnailId?.trim() || null,
    cover_id: data.coverId?.trim() || null,
    noi_dung_blocks: buildKhoaHocNoiDungBlocks({
      yeuCauChuanBi: data.yeuCauChuanBi,
      diaChiHoc: data.diaChiHoc,
      includeDiaDiem: needsDiaChi(hinhThuc),
      cheDoHienThi: data.cheDoHienThi,
      goiHocPhi: data.goiHocPhi,
    }),
  };
  if (data.trangThaiKhoaHoc) {
    updateRow.trang_thai_khoa_hoc = data.trangThaiKhoaHoc;
  }

  let { error } = await admin
    .from("org_khoa_hoc")
    .update(updateRow)
    .eq("id_to_chuc", orgId)
    .eq("id", khoaId);

  if (error?.message?.includes("noi_dung_blocks")) {
    delete updateRow.noi_dung_blocks;
    ({ error } = await admin
      .from("org_khoa_hoc")
      .update(updateRow)
      .eq("id_to_chuc", orgId)
      .eq("id", khoaId));
  }

  if (error) {
    return { ok: false, error: error.message };
  }

  const lopMap = await fetchLopMetaForKhoa([khoaId]);
  const lopResult = await upsertLopDauTien(
    khoaId,
    data.tenKhoaHoc,
    data.loaiMoHinh,
    {
      lopId: lopMap.get(khoaId)?.lopId,
      ngayKhaiGiang: data.ngayKhaiGiang,
      hinhThuc,
      lichHoc: data.lichHoc,
    },
  );
  if (!lopResult.ok) {
    return lopResult;
  }

  const khoaHoc = await fetchKhoaHocCard(orgId, khoaId, coverVariant);
  if (!khoaHoc) {
    return { ok: false, error: "Không tìm thấy khóa học sau khi cập nhật." };
  }
  return { ok: true, khoaHoc };
}

export async function xoaKhoaHoc(
  orgId: string,
  khoaId: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await canViewerManageKhoaHoc(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền xóa khóa học." };
  }
  if (!(await assertCoSoOrg(orgId))) {
    return { ok: false, error: "Không tìm thấy cơ sở đào tạo." };
  }

  const admin = createServiceRoleClient();

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id_to_chuc", orgId)
    .eq("id", khoaId)
    .maybeSingle();
  if (!khoa?.id) {
    return { ok: false, error: "Không tìm thấy khóa học." };
  }

  let resolvedLopRows: ScaffoldLopDbRow[] = [];
  const { data: lopRows, error: lopListError } = await admin
    .from("org_lop_hoc")
    .select("id, ma_lop, giao_vien_phu_trach, giao_vien_text")
    .eq("id_khoa_hoc", khoaId);

  if (lopListError?.message?.includes("giao_vien_text")) {
    const fallback = await admin
      .from("org_lop_hoc")
      .select("id, ma_lop, giao_vien_phu_trach")
      .eq("id_khoa_hoc", khoaId);
    if (fallback.error) {
      return { ok: false, error: fallback.error.message };
    }
    resolvedLopRows = fallback.data ?? [];
  } else if (lopListError) {
    return { ok: false, error: lopListError.message };
  } else {
    resolvedLopRows = lopRows ?? [];
  }

  const realLopRows = resolvedLopRows.filter((row) => !isScaffoldLopDbRow(row));
  if (realLopRows.length > 0) {
    return {
      ok: false,
      error: "Không xóa được — khóa đã có lớp học. Hãy xóa hoặc chuyển lớp trước.",
    };
  }

  if (resolvedLopRows.length > 0) {
    const { error: lopDeleteError } = await admin
      .from("org_lop_hoc")
      .delete()
      .eq("id_khoa_hoc", khoaId);
    if (lopDeleteError) {
      return { ok: false, error: lopDeleteError.message };
    }
  }

  const { count: hvCount } = await admin
    .from("user_hoc_vien_lop")
    .select("id", { count: "exact", head: true })
    .eq("id_khoa_hoc", khoaId);
  if ((hvCount ?? 0) > 0) {
    return {
      ok: false,
      error: "Không xóa được — khóa đã có học viên đăng ký.",
    };
  }

  const { error } = await admin
    .from("org_khoa_hoc")
    .delete()
    .eq("id_to_chuc", orgId)
    .eq("id", khoaId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
