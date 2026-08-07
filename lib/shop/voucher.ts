import "server-only";

import { shopImageUrl, assertBanHangEnabled } from "@/lib/shop/settings";
import { tinhGiamVoucher } from "@/lib/shop/uu-dai";
import type {
  ShopLoaiGiam,
  ShopVoucher,
  ShopVoucherDesign,
  ShopVoucherLyDoHet,
  ShopVoucherViItem,
} from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const VOUCHER_SELECT =
  "id, id_nguoi_dung, ma, ten, mo_ta, loai_giam, gia_tri, giam_toi_da, don_toi_thieu, so_luong_tong, so_luong_da_dung, gioi_han_moi_nguoi, bat_dau, ket_thuc, kich_hoat, cong_khai, design_kieu, design_anh_id, design_mau_nen, design_mau_chu, design_nhan, da_xoa, tao_luc";

type VoucherRow = {
  id: string;
  id_nguoi_dung: string;
  ma: string;
  ten: string;
  mo_ta: string | null;
  loai_giam: ShopLoaiGiam;
  gia_tri: number | string;
  giam_toi_da: number | string | null;
  don_toi_thieu: number | string;
  so_luong_tong: number | null;
  so_luong_da_dung: number;
  gioi_han_moi_nguoi: number;
  bat_dau: string | null;
  ket_thuc: string | null;
  kich_hoat: boolean;
  cong_khai: boolean;
  design_kieu: ShopVoucherDesign;
  design_anh_id: string | null;
  design_mau_nen: string | null;
  design_mau_chu: string | null;
  design_nhan: string | null;
  da_xoa?: boolean;
  tao_luc: string;
};

function num(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function mapVoucher(r: VoucherRow): ShopVoucher {
  return {
    id: r.id,
    idNguoiDung: r.id_nguoi_dung,
    ma: r.ma,
    ten: r.ten,
    moTa: r.mo_ta,
    loaiGiam: r.loai_giam,
    giaTri: num(r.gia_tri) ?? 0,
    giamToiDa: num(r.giam_toi_da),
    donToiThieu: num(r.don_toi_thieu) ?? 0,
    soLuongTong: r.so_luong_tong,
    soLuongDaDung: r.so_luong_da_dung ?? 0,
    gioiHanMoiNguoi: r.gioi_han_moi_nguoi ?? 1,
    batDau: r.bat_dau,
    ketThuc: r.ket_thuc,
    kichHoat: r.kich_hoat === true,
    congKhai: r.cong_khai === true,
    designKieu: r.design_kieu ?? "mac_dinh",
    designAnhId: r.design_anh_id,
    designAnhUrl: shopImageUrl(r.design_anh_id),
    designMauNen: r.design_mau_nen,
    designMauChu: r.design_mau_chu,
    designNhan: r.design_nhan,
    taoLuc: r.tao_luc,
  };
}

const MA_RE = /^[A-Z0-9]{3,20}$/;
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function normalizeVoucherMa(raw: string): string {
  const ma = raw.trim().toUpperCase();
  if (!MA_RE.test(ma)) throw new Error("VOUCHER_MA_INVALID");
  return ma;
}

export function randomVoucherMa(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return out;
}

export type VoucherCreateInput = {
  ma: string;
  ten: string;
  moTa?: string | null;
  loaiGiam: ShopLoaiGiam;
  giaTri: number;
  giamToiDa?: number | null;
  donToiThieu?: number;
  soLuongTong?: number | null;
  gioiHanMoiNguoi?: number;
  batDau?: string | null;
  ketThuc?: string | null;
  kichHoat?: boolean;
  congKhai?: boolean;
  designKieu?: ShopVoucherDesign;
  designAnhId?: string | null;
  designMauNen?: string | null;
  designMauChu?: string | null;
  designNhan?: string | null;
};

function normalizeTen(raw: string): string {
  const t = raw.trim();
  if (!t || t.length > 80) throw new Error("VOUCHER_TEN_INVALID");
  return t;
}

function normalizeMoTa(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.length > 280) throw new Error("VOUCHER_MO_TA_INVALID");
  return t;
}

function validateGiam(
  loaiGiam: ShopLoaiGiam,
  giaTri: number,
  giamToiDa: number | null | undefined,
): { giaTri: number; giamToiDa: number | null } {
  if (!Number.isFinite(giaTri) || giaTri <= 0) {
    throw new Error("VOUCHER_GIA_TRI_INVALID");
  }
  if (loaiGiam === "phan_tram" && giaTri > 100) {
    throw new Error("VOUCHER_GIA_TRI_INVALID");
  }
  let toiDa: number | null = null;
  if (giamToiDa != null) {
    if (!Number.isFinite(giamToiDa) || giamToiDa <= 0) {
      throw new Error("VOUCHER_GIAM_TOI_DA_INVALID");
    }
    toiDa = giamToiDa;
  }
  return { giaTri, giamToiDa: toiDa };
}

function validateThoiGian(
  batDau: string | null | undefined,
  ketThuc: string | null | undefined,
): { batDau: string | null; ketThuc: string | null } {
  const bd = batDau?.trim() || null;
  const kt = ketThuc?.trim() || null;
  if (bd && Number.isNaN(Date.parse(bd))) throw new Error("VOUCHER_THOI_GIAN_INVALID");
  if (kt && Number.isNaN(Date.parse(kt))) throw new Error("VOUCHER_THOI_GIAN_INVALID");
  if (bd && kt && Date.parse(kt) <= Date.parse(bd)) {
    throw new Error("VOUCHER_THOI_GIAN_INVALID");
  }
  return { batDau: bd, ketThuc: kt };
}

function normalizeDesign(
  input: Partial<VoucherCreateInput>,
): Record<string, unknown> {
  const kieu: ShopVoucherDesign =
    input.designKieu === "rieng" ? "rieng" : "mac_dinh";
  const out: Record<string, unknown> = { design_kieu: kieu };
  if (kieu === "mac_dinh") {
    out.design_anh_id = null;
    out.design_mau_nen = null;
    out.design_mau_chu = null;
    out.design_nhan = null;
    return out;
  }
  if (input.designAnhId !== undefined) {
    out.design_anh_id = input.designAnhId?.trim() || null;
  }
  if (input.designMauNen !== undefined) {
    const m = input.designMauNen?.trim() || null;
    if (m && !HEX_RE.test(m)) throw new Error("VOUCHER_DESIGN_INVALID");
    out.design_mau_nen = m;
  }
  if (input.designMauChu !== undefined) {
    const m = input.designMauChu?.trim() || null;
    if (m && !HEX_RE.test(m)) throw new Error("VOUCHER_DESIGN_INVALID");
    out.design_mau_chu = m;
  }
  if (input.designNhan !== undefined) {
    const n = input.designNhan?.trim() || null;
    if (n && n.length > 24) throw new Error("VOUCHER_DESIGN_INVALID");
    out.design_nhan = n;
  }
  return out;
}

/** Tính trạng thái hiệu lực runtime (ví / săn voucher). */
export function evaluateVoucherHieuLuc(
  v: ShopVoucher,
  luotDaDungCuaToi: number,
  now: Date = new Date(),
): { conHieuLuc: boolean; lyDoHetHieuLuc: ShopVoucherLyDoHet | null } {
  if (!v.kichHoat) return { conHieuLuc: false, lyDoHetHieuLuc: "tat" };
  if (v.batDau && new Date(v.batDau) > now) {
    return { conHieuLuc: false, lyDoHetHieuLuc: "chua_bat_dau" };
  }
  if (v.ketThuc && new Date(v.ketThuc) <= now) {
    return { conHieuLuc: false, lyDoHetHieuLuc: "het_han" };
  }
  if (v.soLuongTong != null && v.soLuongDaDung >= v.soLuongTong) {
    return { conHieuLuc: false, lyDoHetHieuLuc: "het_luot" };
  }
  if (v.gioiHanMoiNguoi > 0 && luotDaDungCuaToi >= v.gioiHanMoiNguoi) {
    return { conHieuLuc: false, lyDoHetHieuLuc: "da_dung" };
  }
  return { conHieuLuc: true, lyDoHetHieuLuc: null };
}

export async function listVoucher(ownerId: string): Promise<ShopVoucher[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_voucher")
    .select(VOUCHER_SELECT)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false });
  if (error) throw new Error("VOUCHER_LIST_FAILED");
  return ((data ?? []) as VoucherRow[]).map(mapVoucher);
}

export async function getVoucher(
  ownerId: string,
  id: string,
): Promise<ShopVoucher | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_voucher")
    .select(VOUCHER_SELECT)
    .eq("id", id)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .maybeSingle<VoucherRow>();
  return data ? mapVoucher(data) : null;
}

export async function getVoucherByMa(
  sellerId: string,
  ma: string,
): Promise<ShopVoucher | null> {
  const normalized = normalizeVoucherMa(ma);
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_voucher")
    .select(VOUCHER_SELECT)
    .eq("id_nguoi_dung", sellerId)
    .eq("ma", normalized)
    .eq("da_xoa", false)
    .maybeSingle<VoucherRow>();
  return data ? mapVoucher(data) : null;
}

export async function createVoucher(
  ownerId: string,
  input: VoucherCreateInput,
): Promise<ShopVoucher> {
  await assertBanHangEnabled(ownerId);
  const ma = normalizeVoucherMa(input.ma);
  const ten = normalizeTen(input.ten);
  const moTa = normalizeMoTa(input.moTa);
  const { giaTri, giamToiDa } = validateGiam(
    input.loaiGiam,
    input.giaTri,
    input.giamToiDa,
  );
  const { batDau, ketThuc } = validateThoiGian(input.batDau, input.ketThuc);
  const donToiThieu = input.donToiThieu ?? 0;
  if (!Number.isFinite(donToiThieu) || donToiThieu < 0) {
    throw new Error("VOUCHER_DON_TOI_THIEU_INVALID");
  }
  let soLuongTong: number | null = null;
  if (input.soLuongTong != null) {
    const n = Math.trunc(input.soLuongTong);
    if (!Number.isFinite(n) || n <= 0) throw new Error("VOUCHER_SO_LUONG_INVALID");
    soLuongTong = n;
  }
  const gioiHan =
    input.gioiHanMoiNguoi === undefined
      ? 1
      : Math.trunc(input.gioiHanMoiNguoi);
  if (!Number.isFinite(gioiHan) || gioiHan < 0) {
    throw new Error("VOUCHER_GIOI_HAN_INVALID");
  }
  const design = normalizeDesign(input);

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_voucher")
    .insert({
      id_nguoi_dung: ownerId,
      ma,
      ten,
      mo_ta: moTa,
      loai_giam: input.loaiGiam,
      gia_tri: giaTri,
      giam_toi_da: giamToiDa,
      don_toi_thieu: donToiThieu,
      so_luong_tong: soLuongTong,
      gioi_han_moi_nguoi: gioiHan,
      bat_dau: batDau,
      ket_thuc: ketThuc,
      kich_hoat: input.kichHoat !== false,
      cong_khai: input.congKhai !== false,
      ...design,
    })
    .select(VOUCHER_SELECT)
    .single<VoucherRow>();
  if (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "23505") throw new Error("VOUCHER_MA_DUPLICATE");
    console.error("[shop] createVoucher", error);
    throw new Error("VOUCHER_CREATE_FAILED");
  }
  return mapVoucher(data);
}

export async function updateVoucher(
  ownerId: string,
  id: string,
  patch: Partial<VoucherCreateInput> & { kichHoat?: boolean },
): Promise<ShopVoucher> {
  await assertBanHangEnabled(ownerId);
  const existing = await getVoucher(ownerId, id);
  if (!existing) throw new Error("VOUCHER_NOT_FOUND");

  const update: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (patch.ma !== undefined) update.ma = normalizeVoucherMa(patch.ma);
  if (patch.ten !== undefined) update.ten = normalizeTen(patch.ten);
  if (patch.moTa !== undefined) update.mo_ta = normalizeMoTa(patch.moTa);
  if (patch.loaiGiam !== undefined || patch.giaTri !== undefined) {
    const loai = patch.loaiGiam ?? existing.loaiGiam;
    const gt = patch.giaTri ?? existing.giaTri;
    const { giaTri, giamToiDa } = validateGiam(
      loai,
      gt,
      patch.giamToiDa !== undefined ? patch.giamToiDa : existing.giamToiDa,
    );
    update.loai_giam = loai;
    update.gia_tri = giaTri;
    update.giam_toi_da = giamToiDa;
  } else if (patch.giamToiDa !== undefined) {
    update.giam_toi_da =
      patch.giamToiDa == null
        ? null
        : validateGiam(existing.loaiGiam, existing.giaTri, patch.giamToiDa)
            .giamToiDa;
  }
  if (patch.donToiThieu !== undefined) {
    if (!Number.isFinite(patch.donToiThieu) || patch.donToiThieu < 0) {
      throw new Error("VOUCHER_DON_TOI_THIEU_INVALID");
    }
    update.don_toi_thieu = patch.donToiThieu;
  }
  if (patch.soLuongTong !== undefined) {
    if (patch.soLuongTong == null) {
      update.so_luong_tong = null;
    } else {
      const n = Math.trunc(patch.soLuongTong);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error("VOUCHER_SO_LUONG_INVALID");
      }
      if (n < existing.soLuongDaDung) {
        throw new Error("VOUCHER_SO_LUONG_TOO_LOW");
      }
      update.so_luong_tong = n;
    }
  }
  if (patch.gioiHanMoiNguoi !== undefined) {
    const g = Math.trunc(patch.gioiHanMoiNguoi);
    if (!Number.isFinite(g) || g < 0) throw new Error("VOUCHER_GIOI_HAN_INVALID");
    update.gioi_han_moi_nguoi = g;
  }
  if (patch.batDau !== undefined || patch.ketThuc !== undefined) {
    const { batDau, ketThuc } = validateThoiGian(
      patch.batDau !== undefined ? patch.batDau : existing.batDau,
      patch.ketThuc !== undefined ? patch.ketThuc : existing.ketThuc,
    );
    update.bat_dau = batDau;
    update.ket_thuc = ketThuc;
  }
  if (patch.kichHoat !== undefined) update.kich_hoat = patch.kichHoat === true;
  if (patch.congKhai !== undefined) update.cong_khai = patch.congKhai === true;
  if (
    patch.designKieu !== undefined ||
    patch.designAnhId !== undefined ||
    patch.designMauNen !== undefined ||
    patch.designMauChu !== undefined ||
    patch.designNhan !== undefined
  ) {
    Object.assign(
      update,
      normalizeDesign({
        designKieu: patch.designKieu ?? existing.designKieu,
        designAnhId:
          patch.designAnhId !== undefined
            ? patch.designAnhId
            : existing.designAnhId,
        designMauNen:
          patch.designMauNen !== undefined
            ? patch.designMauNen
            : existing.designMauNen,
        designMauChu:
          patch.designMauChu !== undefined
            ? patch.designMauChu
            : existing.designMauChu,
        designNhan:
          patch.designNhan !== undefined
            ? patch.designNhan
            : existing.designNhan,
      }),
    );
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_voucher")
    .update(update)
    .eq("id", id)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .select(VOUCHER_SELECT)
    .single<VoucherRow>();
  if (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "23505") throw new Error("VOUCHER_MA_DUPLICATE");
    throw new Error("VOUCHER_UPDATE_FAILED");
  }
  if (!data) throw new Error("VOUCHER_NOT_FOUND");
  return mapVoucher(data);
}

export async function softDeleteVoucher(
  ownerId: string,
  id: string,
): Promise<void> {
  await assertBanHangEnabled(ownerId);
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_voucher")
    .update({
      da_xoa: true,
      kich_hoat: false,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .select("id");
  if (error) throw new Error("VOUCHER_DELETE_FAILED");
  if (!data?.length) throw new Error("VOUCHER_NOT_FOUND");
}

async function countSuDungBuyer(
  voucherId: string,
  buyerId: string,
): Promise<number> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("shop_voucher_su_dung")
    .select("id", { count: "exact", head: true })
    .eq("id_voucher", voucherId)
    .eq("id_nguoi_dung", buyerId);
  return count ?? 0;
}

/**
 * Validate voucher cho checkout preview / chốt đơn.
 * Throw mã lỗi VOUCHER_* khi không hợp lệ.
 */
export async function assertVoucherApDung(
  sellerId: string,
  buyerId: string,
  ma: string,
  tongHang: number,
  tongSauCombo: number,
): Promise<{ voucher: ShopVoucher; tienGiam: number }> {
  const voucher = await getVoucherByMa(sellerId, ma);
  if (!voucher) throw new Error("VOUCHER_KHONG_TON_TAI");
  if (voucher.idNguoiDung !== sellerId) throw new Error("VOUCHER_KHAC_SHOP");
  if (!voucher.kichHoat) throw new Error("VOUCHER_TAT");

  const now = Date.now();
  if (voucher.batDau && Date.parse(voucher.batDau) > now) {
    throw new Error("VOUCHER_CHUA_BAT_DAU");
  }
  if (voucher.ketThuc && Date.parse(voucher.ketThuc) <= now) {
    throw new Error("VOUCHER_HET_HAN");
  }
  if (
    voucher.soLuongTong != null &&
    voucher.soLuongDaDung >= voucher.soLuongTong
  ) {
    throw new Error("VOUCHER_HET_LUOT");
  }
  const daDung = await countSuDungBuyer(voucher.id, buyerId);
  if (voucher.gioiHanMoiNguoi > 0 && daDung >= voucher.gioiHanMoiNguoi) {
    throw new Error("VOUCHER_DA_DUNG");
  }
  if (tongHang < voucher.donToiThieu) {
    throw new Error("VOUCHER_CHUA_DU_TOI_THIEU");
  }
  const tienGiam = tinhGiamVoucher(tongSauCombo, tongHang, voucher);
  if (tienGiam <= 0 && voucher.loaiGiam === "so_tien" && voucher.giaTri > 0) {
    /* tongSauCombo = 0 sau combo — vẫn cho áp với tienGiam = 0? Không — báo. */
    if (tongSauCombo <= 0) throw new Error("VOUCHER_KHONG_AP_DUNG");
  }
  return { voucher, tienGiam };
}

/** Atomic RPC — gọi sau khi đã insert đơn. */
export async function dungVoucherAtomic(
  voucherId: string,
  buyerId: string,
  donHangId: string,
  tienGiam: number,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin.rpc("shop_dung_voucher", {
    p_id_voucher: voucherId,
    p_id_nguoi_dung: buyerId,
    p_id_don_hang: donHangId,
    p_tien_giam: tienGiam,
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("VOUCHER_HET_LUOT")) throw new Error("VOUCHER_HET_LUOT");
    if (msg.includes("VOUCHER_DA_DUNG")) throw new Error("VOUCHER_DA_DUNG");
    if (msg.includes("VOUCHER_KHONG_TON_TAI")) {
      throw new Error("VOUCHER_KHONG_TON_TAI");
    }
    console.error("[shop] dungVoucherAtomic", error);
    throw new Error("VOUCHER_DUNG_FAILED");
  }
}

export async function hoanVoucherChoDon(donHangId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin.rpc("shop_hoan_voucher", {
    p_id_don_hang: donHangId,
  });
  if (error) {
    console.error("[shop] hoanVoucherChoDon", error);
  }
}

/** Voucher công khai đang chạy — hub /cua-hang hoặc theo seller. */
export async function listVoucherCongKhai(opts?: {
  sellerId?: string | null;
  buyerId?: string | null;
  limit?: number;
}): Promise<
  Array<
    ShopVoucher & {
      daLuu: boolean;
      tenCuaHang: string | null;
      sellerSlug: string | null;
    }
  >
> {
  const limit = Math.min(Math.max(opts?.limit ?? 20, 1), 50);
  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  let q = admin
    .from("shop_voucher")
    .select(VOUCHER_SELECT)
    .eq("da_xoa", false)
    .eq("kich_hoat", true)
    .eq("cong_khai", true)
    .or(`bat_dau.is.null,bat_dau.lte.${nowIso}`)
    .or(`ket_thuc.is.null,ket_thuc.gt.${nowIso}`)
    .order("ket_thuc", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (opts?.sellerId) q = q.eq("id_nguoi_dung", opts.sellerId);

  const { data, error } = await q;
  if (error) throw new Error("VOUCHER_LIST_FAILED");
  let rows = ((data ?? []) as VoucherRow[]).map(mapVoucher);
  /* Lọc hết lượt ở app (PostgREST khó so sánh 2 cột). */
  rows = rows.filter(
    (v) => v.soLuongTong == null || v.soLuongDaDung < v.soLuongTong,
  );

  const sellerIds = [...new Set(rows.map((v) => v.idNguoiDung))];
  const shopBySeller = new Map<
    string,
    { ten: string | null; slug: string | null }
  >();
  if (sellerIds.length) {
    const [{ data: shops }, { data: users }] = await Promise.all([
      admin
        .from("shop_cua_hang")
        .select("id_nguoi_dung, ten")
        .in("id_nguoi_dung", sellerIds)
        .eq("da_xoa", false),
      admin
        .from("user_nguoi_dung")
        .select("id, slug")
        .in("id", sellerIds),
    ]);
    const slugById = new Map(
      ((users ?? []) as Array<{ id: string; slug: string | null }>).map((u) => [
        u.id,
        u.slug,
      ]),
    );
    for (const s of (shops ?? []) as Array<{
      id_nguoi_dung: string;
      ten: string | null;
    }>) {
      shopBySeller.set(s.id_nguoi_dung, {
        ten: s.ten,
        slug: slugById.get(s.id_nguoi_dung) ?? null,
      });
    }
  }

  const daLuu = new Set<string>();
  if (opts?.buyerId && rows.length) {
    const { data: luu } = await admin
      .from("shop_voucher_luu")
      .select("id_voucher")
      .eq("id_nguoi_dung", opts.buyerId)
      .in(
        "id_voucher",
        rows.map((v) => v.id),
      );
    for (const r of (luu ?? []) as Array<{ id_voucher: string }>) {
      daLuu.add(r.id_voucher);
    }
  }

  return rows.map((v) => {
    const shop = shopBySeller.get(v.idNguoiDung);
    return {
      ...v,
      daLuu: daLuu.has(v.id),
      tenCuaHang: shop?.ten?.trim() || null,
      sellerSlug: shop?.slug ?? null,
    };
  });
}

export async function luuVoucherVi(
  buyerId: string,
  voucherId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: v } = await admin
    .from("shop_voucher")
    .select("id, cong_khai, kich_hoat, da_xoa")
    .eq("id", voucherId)
    .maybeSingle<{
      id: string;
      cong_khai: boolean;
      kich_hoat: boolean;
      da_xoa: boolean;
    }>();
  if (!v || v.da_xoa || !v.kich_hoat || !v.cong_khai) {
    throw new Error("VOUCHER_KHONG_TON_TAI");
  }
  const { error } = await admin.from("shop_voucher_luu").upsert(
    { id_voucher: voucherId, id_nguoi_dung: buyerId },
    { onConflict: "id_voucher,id_nguoi_dung", ignoreDuplicates: true },
  );
  if (error) throw new Error("VOUCHER_LUU_FAILED");
}

export async function goVoucherVi(
  buyerId: string,
  voucherId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  await admin
    .from("shop_voucher_luu")
    .delete()
    .eq("id_nguoi_dung", buyerId)
    .eq("id_voucher", voucherId);
}

/** Ví buyer — ẩn thẻ hết hiệu lực > 30 ngày. */
export async function listVoucherVi(
  buyerId: string,
): Promise<ShopVoucherViItem[]> {
  const admin = createServiceRoleClient();
  const { data: luuRows, error } = await admin
    .from("shop_voucher_luu")
    .select("id_voucher, tao_luc")
    .eq("id_nguoi_dung", buyerId)
    .order("tao_luc", { ascending: false })
    .limit(100);
  if (error) throw new Error("VOUCHER_VI_FAILED");
  const luu = (luuRows ?? []) as Array<{
    id_voucher: string;
    tao_luc: string;
  }>;
  if (luu.length === 0) return [];

  const ids = luu.map((r) => r.id_voucher);
  const { data: vRows } = await admin
    .from("shop_voucher")
    .select(VOUCHER_SELECT)
    .in("id", ids)
    .eq("da_xoa", false);
  const byId = new Map(
    ((vRows ?? []) as VoucherRow[]).map((r) => [r.id, mapVoucher(r)]),
  );

  const sellerIds = [
    ...new Set(
      [...byId.values()].map((v) => v.idNguoiDung),
    ),
  ];
  const shopBySeller = new Map<
    string,
    { ten: string | null; slug: string | null }
  >();
  if (sellerIds.length) {
    const [{ data: shops }, { data: users }] = await Promise.all([
      admin
        .from("shop_cua_hang")
        .select("id_nguoi_dung, ten")
        .in("id_nguoi_dung", sellerIds)
        .eq("da_xoa", false),
      admin.from("user_nguoi_dung").select("id, slug").in("id", sellerIds),
    ]);
    const slugById = new Map(
      ((users ?? []) as Array<{ id: string; slug: string | null }>).map((u) => [
        u.id,
        u.slug,
      ]),
    );
    for (const s of (shops ?? []) as Array<{
      id_nguoi_dung: string;
      ten: string | null;
    }>) {
      shopBySeller.set(s.id_nguoi_dung, {
        ten: s.ten,
        slug: slugById.get(s.id_nguoi_dung) ?? null,
      });
    }
  }

  const now = new Date();
  const hideBefore = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const out: ShopVoucherViItem[] = [];

  for (const row of luu) {
    const v = byId.get(row.id_voucher);
    if (!v) continue;
    const daDung = await countSuDungBuyer(v.id, buyerId);
    const { conHieuLuc, lyDoHetHieuLuc } = evaluateVoucherHieuLuc(
      v,
      daDung,
      now,
    );
    if (!conHieuLuc) {
      const endMs = v.ketThuc ? Date.parse(v.ketThuc) : 0;
      const ref = Math.max(endMs, Date.parse(row.tao_luc));
      if (ref < hideBefore && lyDoHetHieuLuc !== "het_luot") continue;
    }
    const shop = shopBySeller.get(v.idNguoiDung);
    out.push({
      ...v,
      daLuu: true,
      luuLuc: row.tao_luc,
      conHieuLuc,
      lyDoHetHieuLuc,
      tenCuaHang: shop?.ten?.trim() || null,
      sellerSlug: shop?.slug ?? null,
    });
  }
  return out;
}
