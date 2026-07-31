import "server-only";

import {
  applyShopGateFromSignals,
} from "@/lib/shop/gate";
import {
  hanTraChoKy,
  kyDauThang,
  kyThangTruoc,
  roundVnd,
  shopPhiTyLe,
} from "@/lib/shop/phi-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";

export const SHOP_PHI_DEN_HAN_LOAI = "shop_phi_den_han" as const;

export type ShopPhiKy = {
  id: string;
  idNguoiBan: string;
  ky: string;
  gmvGhiNhan: number;
  tyLe: number;
  phiPhaiTra: number;
  trangThai: "chua_chot" | "chua_tra" | "da_tra" | "qua_han" | "mien";
  hanTra: string | null;
  bienLaiAnhId: string | null;
  bienLaiAnhUrl: string | null;
  xacNhanLuc: string | null;
  taoLuc: string;
};

type KyRow = {
  id: string;
  id_nguoi_ban: string;
  ky: string;
  gmv_ghi_nhan: number | string;
  ty_le: number | string;
  phi_phai_tra: number | string;
  trang_thai: ShopPhiKy["trangThai"];
  han_tra: string | null;
  bien_lai_anh_id: string | null;
  bien_lai_anh_url: string | null;
  xac_nhan_luc: string | null;
  tao_luc: string;
};

const KY_SELECT =
  "id, id_nguoi_ban, ky, gmv_ghi_nhan, ty_le, phi_phai_tra, trang_thai, han_tra, bien_lai_anh_id, bien_lai_anh_url, xac_nhan_luc, tao_luc";

function mapKy(r: KyRow): ShopPhiKy {
  return {
    id: r.id,
    idNguoiBan: r.id_nguoi_ban,
    ky: r.ky,
    gmvGhiNhan: Number(r.gmv_ghi_nhan),
    tyLe: Number(r.ty_le),
    phiPhaiTra: Number(r.phi_phai_tra),
    trangThai: r.trang_thai,
    hanTra: r.han_tra,
    bienLaiAnhId: r.bien_lai_anh_id,
    bienLaiAnhUrl: r.bien_lai_anh_url,
    xacNhanLuc: r.xac_nhan_luc,
    taoLuc: r.tao_luc,
  };
}

/** Ghi phí dòng khi đơn hoàn thành (idempotent theo id_don_hang). */
export async function ghiPhiDongKhiHoanThanh(input: {
  idDonHang: string;
  idNguoiBan: string;
  gmv: number;
  hoanThanhLuc?: string | null;
}): Promise<void> {
  const gmv = roundVnd(input.gmv);
  if (gmv <= 0) return;
  const tyLe = await shopPhiTyLe();
  const phi = roundVnd(gmv * tyLe);
  const admin = createServiceRoleClient();

  const hoanLuc = input.hoanThanhLuc
    ? new Date(input.hoanThanhLuc)
    : new Date();
  const ky = kyDauThang(hoanLuc);

  /* Đảm bảo có kỳ chua_chot / chua_tra cho tháng. */
  const { data: kyRow } = await admin
    .from("shop_phi_ky")
    .upsert(
      {
        id_nguoi_ban: input.idNguoiBan,
        ky,
        gmv_ghi_nhan: 0,
        ty_le: tyLe,
        phi_phai_tra: 0,
        trang_thai: "chua_chot",
        han_tra: hanTraChoKy(ky),
        cap_nhat_luc: new Date().toISOString(),
      },
      { onConflict: "id_nguoi_ban,ky", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle<{ id: string }>();

  let idKy = kyRow?.id ?? null;
  if (!idKy) {
    const { data: existing } = await admin
      .from("shop_phi_ky")
      .select("id")
      .eq("id_nguoi_ban", input.idNguoiBan)
      .eq("ky", ky)
      .maybeSingle<{ id: string }>();
    idKy = existing?.id ?? null;
  }

  const { error } = await admin.from("shop_phi_dong").upsert(
    {
      id_don_hang: input.idDonHang,
      id_nguoi_ban: input.idNguoiBan,
      id_ky: idKy,
      gmv,
      ty_le: tyLe,
      phi,
      loai_tru: false,
    },
    { onConflict: "id_don_hang", ignoreDuplicates: true },
  );
  if (error) {
    console.error("[shop] ghiPhiDong", error);
  }

  if (idKy) await recalculatePhiKy(idKy);
}

export async function loaiTruPhiDong(
  idDonHang: string,
  lyDo: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_phi_dong")
    .update({
      loai_tru: true,
      ly_do_loai_tru: lyDo.slice(0, 500),
    })
    .eq("id_don_hang", idDonHang)
    .select("id_ky")
    .maybeSingle<{ id_ky: string | null }>();
  if (data?.id_ky) await recalculatePhiKy(data.id_ky);
}

async function recalculatePhiKy(idKy: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: dongs } = await admin
    .from("shop_phi_dong")
    .select("gmv, phi, loai_tru")
    .eq("id_ky", idKy);
  let gmv = 0;
  let phi = 0;
  for (const d of (dongs ?? []) as Array<{
    gmv: number | string;
    phi: number | string;
    loai_tru: boolean;
  }>) {
    if (d.loai_tru) continue;
    gmv += Number(d.gmv);
    phi += Number(d.phi);
  }
  await admin
    .from("shop_phi_ky")
    .update({
      gmv_ghi_nhan: roundVnd(gmv),
      phi_phai_tra: roundVnd(phi),
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", idKy);
}

export async function listPhiKyForSeller(
  sellerId: string,
  limit = 12,
): Promise<ShopPhiKy[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_phi_ky")
    .select(KY_SELECT)
    .eq("id_nguoi_ban", sellerId)
    .order("ky", { ascending: false })
    .limit(Math.min(limit, 24));
  if (error) {
    console.error("[shop] listPhiKy", error);
    throw new Error("LIST_FAILED");
  }
  return ((data ?? []) as KyRow[]).map(mapKy);
}

/** Seller báo đã trả + biên lai. */
export async function baoDaTraPhiKy(
  sellerId: string,
  kyId: string,
  input: { bienLaiAnhUrl: string; bienLaiAnhId?: string | null },
): Promise<ShopPhiKy> {
  const url = input.bienLaiAnhUrl.trim();
  if (!url || url.startsWith("blob:")) throw new Error("RECEIPT_REQUIRED");
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_phi_ky")
    .update({
      bien_lai_anh_url: url,
      bien_lai_anh_id: input.bienLaiAnhId?.trim() || null,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", kyId)
    .eq("id_nguoi_ban", sellerId)
    .in("trang_thai", ["chua_tra", "qua_han", "chua_chot"])
    .select(KY_SELECT)
    .maybeSingle<KyRow>();
  if (error || !data) throw new Error("UPDATE_FAILED");
  return mapKy(data);
}

/** Admin xác nhận đã nhận phí. */
export async function adminXacNhanPhiKy(
  adminId: string,
  kyId: string,
): Promise<ShopPhiKy> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("shop_phi_ky")
    .update({
      trang_thai: "da_tra",
      xac_nhan_boi: adminId,
      xac_nhan_luc: now,
      cap_nhat_luc: now,
    })
    .eq("id", kyId)
    .select(KY_SELECT)
    .maybeSingle<KyRow>();
  if (error || !data) throw new Error("UPDATE_FAILED");
  await applyShopGateFromSignals(data.id_nguoi_ban);
  return mapKy(data);
}

/**
 * Cron: chốt kỳ tháng trước → chua_tra + thông báo; đánh dấu qua_han; cập nhật gate.
 */
export async function chotKyPhiThang(now = new Date()): Promise<{
  chot: number;
  quaHan: number;
}> {
  const admin = createServiceRoleClient();
  const ky = kyThangTruoc(now);
  const tyLe = await shopPhiTyLe();
  const hanTra = hanTraChoKy(ky);
  let chot = 0;

  /* Lấy seller có dòng phí trong kỳ (theo id_ky hoặc theo tháng tạo). */
  const { data: kys } = await admin
    .from("shop_phi_ky")
    .select(KY_SELECT)
    .eq("ky", ky)
    .eq("trang_thai", "chua_chot");

  for (const row of (kys ?? []) as KyRow[]) {
    await recalculatePhiKy(row.id);
    const { data: fresh } = await admin
      .from("shop_phi_ky")
      .select(KY_SELECT)
      .eq("id", row.id)
      .single<KyRow>();
    if (!fresh) continue;
    const phi = Number(fresh.phi_phai_tra);
    if (phi <= 0) {
      await admin
        .from("shop_phi_ky")
        .update({
          trang_thai: "mien",
          han_tra: hanTra,
          ty_le: tyLe,
          cap_nhat_luc: now.toISOString(),
        })
        .eq("id", fresh.id);
      continue;
    }
    await admin
      .from("shop_phi_ky")
      .update({
        trang_thai: "chua_tra",
        han_tra: hanTra,
        ty_le: tyLe,
        cap_nhat_luc: now.toISOString(),
      })
      .eq("id", fresh.id);
    chot += 1;
    await insertSocialThongBao(admin, {
      nguoi_nhan: fresh.id_nguoi_ban,
      loai: "thong_tin",
      loai_doi_tuong: SHOP_PHI_DEN_HAN_LOAI,
      id_doi_tuong: fresh.id,
      noi_dung: `Phí nền tảng kỳ ${ky}: ${roundVnd(phi).toLocaleString("vi-VN")} VND — hạn ${hanTra}.`,
    });
  }

  /* Quá hạn. */
  const today = now.toISOString().slice(0, 10);
  const { data: overdue } = await admin
    .from("shop_phi_ky")
    .select("id, id_nguoi_ban")
    .eq("trang_thai", "chua_tra")
    .lt("han_tra", today)
    .not("han_tra", "is", null);

  let quaHan = 0;
  const sellers = new Set<string>();
  for (const r of (overdue ?? []) as Array<{
    id: string;
    id_nguoi_ban: string;
  }>) {
    await admin
      .from("shop_phi_ky")
      .update({
        trang_thai: "qua_han",
        cap_nhat_luc: now.toISOString(),
      })
      .eq("id", r.id)
      .eq("trang_thai", "chua_tra");
    quaHan += 1;
    sellers.add(r.id_nguoi_ban);
  }
  for (const s of sellers) {
    await applyShopGateFromSignals(s);
  }

  return { chot, quaHan };
}

export async function listPhiKyChoAdmin(limit = 50): Promise<ShopPhiKy[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_phi_ky")
    .select(KY_SELECT)
    .in("trang_thai", ["chua_tra", "qua_han"])
    .not("bien_lai_anh_url", "is", null)
    .order("cap_nhat_luc", { ascending: false })
    .limit(limit);
  return ((data ?? []) as KyRow[]).map(mapKy);
}
