import "server-only";

import { getCsdtPhiGate } from "@/lib/co-so/phi-gate";
import { tinhPhiLuyKeChuaVaoKy } from "@/lib/co-so/phi";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type {
  CinsDichVu,
  DichVuDangTichLuy,
  DichVuHeQua,
  DichVuNoTong,
} from "./types";

function stripAdminPrefix(lyDo: string | null | undefined): string | null {
  if (!lyDo?.trim()) return null;
  return lyDo.replace(/^\[ADMIN\]\s*/i, "").trim() || null;
}

async function heQuaShop(sellerId: string): Promise<DichVuHeQua> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_cua_hang")
    .select("trang_thai_hoat_dong, ly_do_khoa")
    .eq("id_nguoi_dung", sellerId)
    .eq("da_xoa", false)
    .maybeSingle<{
      trang_thai_hoat_dong: string | null;
      ly_do_khoa: string | null;
    }>();

  const tt = (data?.trang_thai_hoat_dong || "hoat_dong").trim();
  const lyDo = stripAdminPrefix(data?.ly_do_khoa);
  if (tt === "khoa") {
    return {
      loai: "khoa_nhan_don",
      trangThai: "khoa",
      lyDo,
      moTa: "Quá hạn phí — không nhận đơn mới cho đến khi tất toán.",
    };
  }
  if (tt === "han_che") {
    return {
      loai: "han_che",
      trangThai: "han_che",
      lyDo,
      moTa: "Shop đang bị hạn chế do tín hiệu vận hành / phí.",
    };
  }
  return {
    loai: "binh_thuong",
    trangThai: "hoat_dong",
    lyDo: null,
    moTa: "Còn nợ quá hạn sẽ khoá nhận đơn mới.",
  };
}

async function heQuaCsdt(orgId: string): Promise<DichVuHeQua> {
  try {
    const gate = await getCsdtPhiGate(orgId);
    if (gate.trangThai === "khoa_ghi_danh") {
      return {
        loai: "khoa_ghi_danh",
        trangThai: "khoa_ghi_danh",
        lyDo: null,
        moTa: "Quá hạn phí — khoá thêm ghi danh mới.",
      };
    }
    if (gate.trangThai === "canh_bao") {
      return {
        loai: "canh_bao",
        trangThai: "canh_bao",
        lyDo: null,
        moTa: gate.tuKhaiTamMo
          ? "Đã tự khai chuyển khoản — tạm mở trong cửa sổ đối soát."
          : "Sắp đến hạn / có kỳ chưa trả — thanh toán sớm để tránh khoá ghi danh.",
      };
    }
    return {
      loai: "binh_thuong",
      trangThai: "hoat_dong",
      lyDo: null,
      moTa: "Còn nợ quá hạn sẽ khoá thêm ghi danh.",
    };
  } catch (e) {
    console.error(
      "[billing] heQuaCsdt",
      e instanceof Error ? e.message : e,
    );
    return {
      loai: "binh_thuong",
      trangThai: "hoat_dong",
      lyDo: null,
      moTa: null,
    };
  }
}

async function dangTichLuyShop(
  sellerId: string,
  nguongXuatKyVnd: number,
): Promise<DichVuDangTichLuy> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_phi_dong")
    .select("gmv, phi, loai_tru")
    .eq("id_nguoi_ban", sellerId)
    .is("id_ky", null);

  let doanhThu = 0;
  let phi = 0;
  for (const r of (data ?? []) as Array<{
    gmv: number | string;
    phi: number | string;
    loai_tru: boolean;
  }>) {
    if (r.loai_tru) continue;
    doanhThu += Number(r.gmv) || 0;
    phi += Number(r.phi) || 0;
  }
  doanhThu = Math.round(doanhThu);
  phi = Math.round(phi);
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); /* 0-based → chốt cuối tháng */
  const last = new Date(Date.UTC(y, m + 1, 0));
  const ngayChot = last.toISOString().slice(0, 10);

  return {
    doanhThuVnd: doanhThu,
    phiDuKienVnd: phi,
    nguongXuatKyVnd,
    duoiNguong: phi < nguongXuatKyVnd,
    ngayChotDuKien: ngayChot,
  };
}

async function dangTichLuyCsdt(
  orgId: string,
  nguongKichHoatVnd: number,
): Promise<DichVuDangTichLuy> {
  const admin = createServiceRoleClient();
  const [{ data }, phiDuKien] = await Promise.all([
    admin
      .from("org_phi_dong")
      .select("doanh_thu_vnd, loai_tru")
      .eq("id_to_chuc", orgId)
      .is("id_ky", null),
    tinhPhiLuyKeChuaVaoKy(orgId),
  ]);
  let doanhThu = 0;
  for (const r of (data ?? []) as Array<{
    doanh_thu_vnd: number | string;
    loai_tru: boolean;
  }>) {
    if (r.loai_tru) continue;
    doanhThu += Number(r.doanh_thu_vnd) || 0;
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const last = new Date(Date.UTC(y, m + 1, 0));
  return {
    doanhThuVnd: Math.round(doanhThu),
    phiDuKienVnd: Math.round(phiDuKien),
    nguongXuatKyVnd: nguongKichHoatVnd,
    duoiNguong: false, /* ngưỡng CSĐT là kích hoạt, không dồn kỳ như shop */
    ngayChotDuKien: last.toISOString().slice(0, 10),
  };
}

async function quanLyHrefFor(dv: CinsDichVu): Promise<string | null> {
  const admin = createServiceRoleClient();
  if (dv.loai === "shop_phi") {
    return "/seller/store";
  }
  if (dv.loai === "csdt_phi") {
    const { data } = await admin
      .from("org_to_chuc")
      .select("slug")
      .eq("id", dv.thamChieuId)
      .maybeSingle<{ slug: string | null }>();
    const slug = data?.slug?.trim();
    return slug ? `/academy/${slug}/manage` : null;
  }
  return null;
}

/** Bổ sung heQua / dangTichLuy / quanLyHref cho từng dòng dịch vụ. */
export async function enrichTheoDichVu(
  rows: DichVuNoTong[],
): Promise<DichVuNoTong[]> {
  return Promise.all(
    rows.map(async (row) => {
      const dv = row.dichVu;
      const [heQua, dangTichLuy, quanLyHref] = await Promise.all([
        dv.loai === "shop_phi"
          ? heQuaShop(dv.thamChieuId)
          : dv.loai === "csdt_phi"
            ? heQuaCsdt(dv.thamChieuId)
            : Promise.resolve({
                loai: "binh_thuong" as const,
                trangThai: "hoat_dong",
                lyDo: null,
                moTa: null,
              }),
        dv.loai === "shop_phi"
          ? dangTichLuyShop(
              dv.thamChieuId,
              dv.toiThieuXuatKyVnd ?? 50_000,
            )
          : dv.loai === "csdt_phi"
            ? dangTichLuyCsdt(
                dv.thamChieuId,
                dv.nguongChotVnd ?? 2_000_000,
              )
            : Promise.resolve(null),
        quanLyHrefFor(dv),
      ]);
      return { ...row, heQua, dangTichLuy, quanLyHref };
    }),
  );
}
