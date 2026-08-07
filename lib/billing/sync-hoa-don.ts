import "server-only";

import type { OrgPhiKyRow } from "@/lib/co-so/phi-ky";
import type { ShopPhiKy } from "@/lib/shop/phi";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { upsertHoaDonTuNguon } from "./hoa-don";
import { ensureDichVu, getOrCreateTk, resolveOrgBillingOwner } from "./tk";

function endOfMonthYmd(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0, 12));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Dual-write: org_phi_ky → cins_hoa_don (không chặn luồng chốt nếu lỗi).
 */
export async function syncHoaDonTuOrgKy(
  ky: OrgPhiKyRow,
): Promise<void> {
  try {
    if (ky.trangThai === "mien" && ky.phiPhaiTraVnd <= 0) {
      /* Vẫn sync để hub/admin thấy kỳ miễn. */
    }
    const { ownerId } = await resolveOrgBillingOwner(ky.idToChuc);
    if (!ownerId) {
      console.error("[billing] sync org: no owner", ky.idToChuc);
      return;
    }
    const tk = await getOrCreateTk(ownerId);
    const dv = await ensureDichVu({
      idTk: tk.id,
      loai: "csdt_phi",
      thamChieuId: ky.idToChuc,
    });
    await upsertHoaDonTuNguon({
      idTk: tk.id,
      idDichVu: dv.id,
      tuNgay: ky.tuNgay,
      denNgay: ky.denNgay,
      ngayChot: ky.ngayChot,
      hanTra: ky.hanTra,
      soTienVnd: ky.phiPhaiTraVnd,
      dieuChinhVnd: ky.dieuChinhVnd,
      daTraVnd: ky.daTraVnd,
      trangThai: ky.trangThai,
      nguonBang: "org_phi_ky",
      nguonId: ky.id,
      seedMa: ky.idToChuc,
      maThamChieu: ky.maThamChieu,
      hoaDonThongTin: {
        doanhThuVnd: ky.doanhThuGhiNhanVnd,
        tyLe: ky.tyLe,
      },
    });
  } catch (e) {
    console.error(
      "[billing] syncHoaDonTuOrgKy",
      ky.id,
      e instanceof Error ? e.message : e,
    );
  }
}

/**
 * Dual-write: shop_phi_ky (đã chốt) → cins_hoa_don.
 */
export async function syncHoaDonTuShopKy(
  ky: ShopPhiKy,
): Promise<void> {
  try {
    if (ky.trangThai === "chua_chot") return;
    const tk = await getOrCreateTk(ky.idNguoiBan);
    const dv = await ensureDichVu({
      idTk: tk.id,
      loai: "shop_phi",
      thamChieuId: ky.idNguoiBan,
    });
    const kyYmd = String(ky.ky).slice(0, 10);
    const den = endOfMonthYmd(kyYmd);
    const so = Math.max(0, Math.round(ky.phiPhaiTra));
    await upsertHoaDonTuNguon({
      idTk: tk.id,
      idDichVu: dv.id,
      tuNgay: kyYmd,
      denNgay: den,
      ngayChot: den,
      hanTra: ky.hanTra || den,
      soTienVnd: so,
      dieuChinhVnd: 0,
      daTraVnd: ky.trangThai === "da_tra" ? so : 0,
      trangThai:
        ky.trangThai === "chua_chot" ? "chua_tra" : ky.trangThai,
      nguonBang: "shop_phi_ky",
      nguonId: ky.id,
      seedMa: `shop:${ky.idNguoiBan}`,
      hoaDonThongTin: {
        doanhThuVnd: Math.max(0, Math.round(ky.gmvGhiNhan)),
        gmv: Math.max(0, Math.round(ky.gmvGhiNhan)),
        tyLe: ky.tyLe,
      },
    });
  } catch (e) {
    console.error(
      "[billing] syncHoaDonTuShopKy",
      ky.id,
      e instanceof Error ? e.message : e,
    );
  }
}

/** Đồng bộ trang_thai khi kỳ nguồn đổi (qua_han / da_tra). */
export async function syncTrangThaiHoaDonTuNguon(input: {
  nguonBang: "org_phi_ky" | "shop_phi_ky";
  nguonId: string;
  trangThai: string;
  daTraVnd?: number;
}): Promise<void> {
  try {
    const admin = createServiceRoleClient();
    const patch: Record<string, unknown> = {
      trang_thai: input.trangThai,
      cap_nhat_luc: new Date().toISOString(),
    };
    if (typeof input.daTraVnd === "number") {
      patch.da_tra_vnd = input.daTraVnd;
    }
    await admin
      .from("cins_hoa_don")
      .update(patch)
      .eq("nguon_bang", input.nguonBang)
      .eq("nguon_id", input.nguonId);
  } catch (e) {
    console.error(
      "[billing] syncTrangThai",
      input.nguonId,
      e instanceof Error ? e.message : e,
    );
  }
}
