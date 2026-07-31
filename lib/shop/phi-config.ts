import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Fallback khi DB chưa có dòng / lỗi đọc. */
const DEFAULT_TY_LE = 0.05;

function clampTyLe(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_TY_LE;
  return Math.min(1, Math.max(0, n));
}

/**
 * Tỷ lệ phí nền tảng: DB `shop_cau_hinh_phi` → env `SHOP_PHI_TY_LE` → 5%.
 * Async — mọi chỗ ghi phí phải await.
 */
export async function shopPhiTyLe(): Promise<number> {
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("shop_cau_hinh_phi")
      .select("ty_le")
      .order("cap_nhat_luc", { ascending: false })
      .limit(1)
      .maybeSingle<{ ty_le: number | string }>();
    if (data?.ty_le != null) {
      return clampTyLe(Number(data.ty_le));
    }
  } catch (e) {
    console.error("[shop] shopPhiTyLe db", e);
  }
  const raw = process.env.SHOP_PHI_TY_LE?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }
  return DEFAULT_TY_LE;
}

export type ShopCauHinhPhi = {
  id: string;
  tyLe: number;
  capNhatBoi: string | null;
  capNhatLuc: string;
};

export async function getShopCauHinhPhi(): Promise<ShopCauHinhPhi> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_cau_hinh_phi")
    .select("id, ty_le, cap_nhat_boi, cap_nhat_luc")
    .order("cap_nhat_luc", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      ty_le: number | string;
      cap_nhat_boi: string | null;
      cap_nhat_luc: string;
    }>();
  if (data) {
    return {
      id: data.id,
      tyLe: clampTyLe(Number(data.ty_le)),
      capNhatBoi: data.cap_nhat_boi,
      capNhatLuc: data.cap_nhat_luc,
    };
  }
  /* Seed nếu trống. */
  const tyLe = await shopPhiTyLe();
  const { data: created, error } = await admin
    .from("shop_cau_hinh_phi")
    .insert({ ty_le: tyLe })
    .select("id, ty_le, cap_nhat_boi, cap_nhat_luc")
    .single<{
      id: string;
      ty_le: number | string;
      cap_nhat_boi: string | null;
      cap_nhat_luc: string;
    }>();
  if (error || !created) {
    console.error("[shop] seed cau hinh phi", error);
    return {
      id: "",
      tyLe,
      capNhatBoi: null,
      capNhatLuc: new Date().toISOString(),
    };
  }
  return {
    id: created.id,
    tyLe: clampTyLe(Number(created.ty_le)),
    capNhatBoi: created.cap_nhat_boi,
    capNhatLuc: created.cap_nhat_luc,
  };
}

/** Admin cập nhật tỷ lệ (0–1). Kỳ/dòng phí đã ghi không đổi. */
export async function updateShopCauHinhPhi(
  adminId: string,
  tyLeInput: number,
): Promise<ShopCauHinhPhi> {
  const tyLe = clampTyLe(tyLeInput);
  const current = await getShopCauHinhPhi();
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  if (current.id) {
    const { data, error } = await admin
      .from("shop_cau_hinh_phi")
      .update({
        ty_le: tyLe,
        cap_nhat_boi: adminId,
        cap_nhat_luc: now,
      })
      .eq("id", current.id)
      .select("id, ty_le, cap_nhat_boi, cap_nhat_luc")
      .single<{
        id: string;
        ty_le: number | string;
        cap_nhat_boi: string | null;
        cap_nhat_luc: string;
      }>();
    if (error || !data) throw new Error("UPDATE_FAILED");
    return {
      id: data.id,
      tyLe: clampTyLe(Number(data.ty_le)),
      capNhatBoi: data.cap_nhat_boi,
      capNhatLuc: data.cap_nhat_luc,
    };
  }

  const { data, error } = await admin
    .from("shop_cau_hinh_phi")
    .insert({
      ty_le: tyLe,
      cap_nhat_boi: adminId,
      cap_nhat_luc: now,
    })
    .select("id, ty_le, cap_nhat_boi, cap_nhat_luc")
    .single<{
      id: string;
      ty_le: number | string;
      cap_nhat_boi: string | null;
      cap_nhat_luc: string;
    }>();
  if (error || !data) throw new Error("UPDATE_FAILED");
  return {
    id: data.id,
    tyLe: clampTyLe(Number(data.ty_le)),
    capNhatBoi: data.cap_nhat_boi,
    capNhatLuc: data.cap_nhat_luc,
  };
}

/** Ngày đầu tháng (UTC date string YYYY-MM-01) cho một mốc thời gian. */
export function kyDauThang(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

/** Kỳ tháng trước. */
export function kyThangTruoc(d: Date = new Date()): string {
  const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return kyDauThang(prev);
}

/** Hạn trả = ngày 15 của tháng sau kỳ. */
export function hanTraChoKy(kyYmd: string): string {
  const [y, m] = kyYmd.split("-").map((x) => Number(x));
  const next = new Date(Date.UTC(y, m, 15));
  const yy = next.getUTCFullYear();
  const mm = next.getUTCMonth() + 1;
  const dd = next.getUTCDate();
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export function roundVnd(n: number): number {
  return Math.max(0, Math.round(n));
}
