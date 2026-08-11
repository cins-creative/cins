import "server-only";

import { createHash } from "node:crypto";

import {
  SHOP_DANG_KY_MO_HINH_THUC,
  SHOP_DANG_KY_MO_KENH,
  SHOP_DANG_KY_MO_LOAI_HANG,
  type ShopDangKyMoHinhThuc,
  type ShopDangKyMoKenh,
} from "@/lib/shop/dang-ky-mo-constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type {
  ShopDangKyMoHinhThuc,
  ShopDangKyMoKenh,
  ShopDangKyMoLoaiHang,
} from "@/lib/shop/dang-ky-mo-constants";
export {
  SHOP_DANG_KY_MO_HINH_THUC,
  SHOP_DANG_KY_MO_KENH,
  SHOP_DANG_KY_MO_KENH_LABEL,
  SHOP_DANG_KY_MO_LOAI_HANG,
  SHOP_DANG_KY_MO_LOAI_HANG_LABEL,
} from "@/lib/shop/dang-ky-mo-constants";

const MAX_TEN = 120;
const MAX_LIEN_HE = 200;
const MAX_EMAIL = 200;
const MAX_GHI_CHU = 2000;
const MAX_LINK = 2000;
const MAX_LINKS = 20;
const MAX_NGAN_HANG = 120;
const MAX_STK = 40;
const MAX_CHU_TK = 120;
const MAX_PROFILE = 500;
const MAX_NGUON = 200;
const MAX_GT = 120;
const MAX_UA = 500;
const MAX_LOAI = 12;

export type CreateShopDangKyMoInput = {
  tenShop: string;
  tenLienHe?: string | null;
  loaiHang?: string[];
  hinhThucBan?: string | null;
  resourceLinksText?: string | null;
  ghiChu?: string | null;
  kenhLienHe: string;
  lienHeGiaTri: string;
  email: string;
  nganHang?: string | null;
  soTaiKhoan?: string | null;
  tenChuTk?: string | null;
  daCoTaiKhoan?: boolean;
  linkProfileCins?: string | null;
  nguoiGioiThieu?: string | null;
  dongYDieuKhoan: boolean;
  dongYDungAnh: boolean;
  nguon?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
};

export type CreateShopDangKyMoResult =
  | {
      ok: true;
      id: string;
      kenhLienHe: ShopDangKyMoKenh;
      lienHeGiaTri: string;
    }
  | { ok: false; error: string; code?: string };

function trimTo(value: string | null | undefined, max: number): string | null {
  const v = (value ?? "").toString().trim();
  if (!v) return null;
  return v.slice(0, max);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseLinks(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    if (out.length >= MAX_LINKS) break;
    const sliced = line.slice(0, MAX_LINK);
    if (!out.includes(sliced)) out.push(sliced);
  }
  return out;
}

function hashIp(ip: string | null | undefined): string | null {
  const v = (ip ?? "").trim();
  if (!v || v === "unknown") return null;
  return createHash("sha256").update(v).digest("hex").slice(0, 32);
}

function isKenh(v: string): v is ShopDangKyMoKenh {
  return (SHOP_DANG_KY_MO_KENH as readonly string[]).includes(v);
}

function isHinhThuc(v: string): v is ShopDangKyMoHinhThuc {
  return (SHOP_DANG_KY_MO_HINH_THUC as readonly string[]).includes(v);
}

function normalizeLoaiHang(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(SHOP_DANG_KY_MO_LOAI_HANG);
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim().slice(0, 40);
    if (!t || !allowed.has(t) || out.includes(t)) continue;
    out.push(t);
    if (out.length >= MAX_LOAI) break;
  }
  return out;
}

/** Tạo lead đăng ký mở shop (public). Insert qua service role. */
export async function createShopDangKyMo(
  input: CreateShopDangKyMoInput,
): Promise<CreateShopDangKyMoResult> {
  const tenShop = trimTo(input.tenShop, MAX_TEN);
  if (!tenShop || tenShop.length < 2) {
    return { ok: false, error: "Vui lòng nhập tên shop.", code: "TEN_SHOP" };
  }

  if (!isKenh(input.kenhLienHe)) {
    return {
      ok: false,
      error: "Vui lòng chọn kênh liên hệ.",
      code: "KENH",
    };
  }
  const kenhLienHe = input.kenhLienHe;

  const lienHeGiaTri = trimTo(input.lienHeGiaTri, MAX_LIEN_HE);
  if (!lienHeGiaTri || lienHeGiaTri.length < 2) {
    return {
      ok: false,
      error: "Vui lòng nhập thông tin liên hệ.",
      code: "LIEN_HE",
    };
  }

  const email = trimTo(input.email, MAX_EMAIL)?.toLowerCase() ?? null;
  if (!email || !isEmail(email)) {
    return {
      ok: false,
      error: "Vui lòng nhập email hợp lệ (dùng để bàn giao shop).",
      code: "EMAIL",
    };
  }

  if (!input.dongYDieuKhoan || !input.dongYDungAnh) {
    return {
      ok: false,
      error: "Bạn cần đồng ý điều khoản và cho phép dùng ảnh để dựng shop.",
      code: "DONG_Y",
    };
  }

  const nganHang = trimTo(input.nganHang, MAX_NGAN_HANG);
  const soTaiKhoan = trimTo(input.soTaiKhoan, MAX_STK);
  const tenChuTk = trimTo(input.tenChuTk, MAX_CHU_TK);
  if (!nganHang || !soTaiKhoan || !tenChuTk) {
    return {
      ok: false,
      error: "Vui lòng điền đủ ngân hàng, số tài khoản và tên chủ TK.",
      code: "STK",
    };
  }

  let hinhThucBan: ShopDangKyMoHinhThuc | null = null;
  if (input.hinhThucBan) {
    if (!isHinhThuc(input.hinhThucBan)) {
      return {
        ok: false,
        error: "Hình thức bán không hợp lệ.",
        code: "HINH_THUC",
      };
    }
    hinhThucBan = input.hinhThucBan;
  }

  const loaiHang = normalizeLoaiHang(input.loaiHang);
  const resourceLinks = parseLinks(input.resourceLinksText);
  const now = new Date().toISOString();

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_dang_ky_mo")
    .insert({
      ten_shop: tenShop,
      ten_lien_he: trimTo(input.tenLienHe, MAX_TEN),
      loai_hang: loaiHang,
      hinh_thuc_ban: hinhThucBan,
      resource_links: resourceLinks,
      ghi_chu: trimTo(input.ghiChu, MAX_GHI_CHU),
      kenh_lien_he: kenhLienHe,
      lien_he_gia_tri: lienHeGiaTri,
      email,
      ngan_hang: nganHang,
      so_tai_khoan: soTaiKhoan,
      ten_chu_tk: tenChuTk,
      da_co_tai_khoan: Boolean(input.daCoTaiKhoan),
      link_profile_cins: trimTo(input.linkProfileCins, MAX_PROFILE),
      nguoi_gioi_thieu: trimTo(input.nguoiGioiThieu, MAX_GT),
      dong_y_dieu_khoan: true,
      dong_y_dung_anh: true,
      dong_y_luc: now,
      trang_thai: "moi",
      nguon: trimTo(input.nguon, MAX_NGUON),
      ip_hash: hashIp(input.clientIp),
      user_agent: trimTo(input.userAgent, MAX_UA),
      cap_nhat_luc: now,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    console.error("[shop] createShopDangKyMo", error.message);
    return { ok: false, error: "Không lưu được đăng ký. Thử lại sau." };
  }

  return {
    ok: true,
    id: data.id,
    kenhLienHe,
    lienHeGiaTri,
  };
}
