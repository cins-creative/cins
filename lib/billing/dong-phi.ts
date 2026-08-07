import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { getHoaDonById } from "./hoa-don";
import { canDocTk, listDichVuForTk } from "./tk";

export type DongPhiItem = {
  thamChieu: string | null;
  ngay: string;
  doanhThuVnd: number;
  tyLe: number;
  phiVnd: number;
  loaiTru: boolean;
  lyDoLoaiTru: string | null;
};

export type DongPhiPayload = {
  items: DongPhiItem[];
  tong: {
    doanhThuVnd: number;
    phiVnd: number;
    soDong: number;
    soLoaiTru: number;
  };
  loai: string;
  tenDichVu: string | null;
};

/**
 * Bảng kê dòng phí của một hoá đơn (shop_phi_dong / org_phi_dong).
 * Không trả PII người mua / học viên — chỉ mã đơn / mã tham chiếu.
 */
export async function listDongPhiHoaDon(input: {
  actorId: string;
  hoaDonId: string;
}): Promise<
  | { ok: true; data: DongPhiPayload }
  | { ok: false; error: string; status: number }
> {
  const hd = await getHoaDonById(input.hoaDonId);
  if (!hd) {
    return { ok: false, error: "Không tìm thấy hoá đơn.", status: 404 };
  }
  if (!(await canDocTk(hd.idTk, input.actorId))) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const dvs = await listDichVuForTk(hd.idTk);
  const dv = dvs.find((d) => d.id === hd.idDichVu);
  const admin = createServiceRoleClient();

  if (dv?.loai === "shop_phi") {
    const { data: rows, error } = await admin
      .from("shop_phi_dong")
      .select(
        "id_don_hang, gmv, ty_le, phi, loai_tru, ly_do_loai_tru, tao_luc, id_hoa_don, id_ky",
      )
      .or(
        hd.nguonId
          ? `id_hoa_don.eq.${hd.id},id_ky.eq.${hd.nguonId}`
          : `id_hoa_don.eq.${hd.id}`,
      )
      .order("tao_luc", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[billing] dong shop", error.message);
      return { ok: false, error: "Không đọc được bảng kê.", status: 500 };
    }

    type R = {
      id_don_hang: string;
      gmv: number | string;
      ty_le: number | string;
      phi: number | string;
      loai_tru: boolean;
      ly_do_loai_tru: string | null;
      tao_luc: string;
    };
    const list = (rows ?? []) as R[];
    const donIds = [...new Set(list.map((r) => r.id_don_hang))];
    const maMap = new Map<string, string>();
    if (donIds.length) {
      const { data: dons } = await admin
        .from("shop_don_hang")
        .select("id, ma_don")
        .in("id", donIds);
      for (const d of (dons ?? []) as Array<{
        id: string;
        ma_don: string | null;
      }>) {
        if (d.ma_don) maMap.set(d.id, d.ma_don);
      }
    }

    const items: DongPhiItem[] = list.map((r) => ({
      thamChieu: maMap.get(r.id_don_hang) ?? null,
      ngay: r.tao_luc.slice(0, 10),
      doanhThuVnd: Math.round(Number(r.gmv) || 0),
      tyLe: Number(r.ty_le) || 0,
      phiVnd: Math.round(Number(r.phi) || 0),
      loaiTru: Boolean(r.loai_tru),
      lyDoLoaiTru: r.ly_do_loai_tru,
    }));

    return {
      ok: true,
      data: {
        items,
        tong: tongItems(items),
        loai: "shop_phi",
        tenDichVu: dv.tenHienThi ?? "Shop",
      },
    };
  }

  if (dv?.loai === "csdt_phi") {
    const { data: rows, error } = await admin
      .from("org_phi_dong")
      .select(
        "id_don_hoc_phi, doanh_thu_vnd, ty_le, phi_vnd, loai_tru, ly_do_loai_tru, xac_nhan_luc, id_hoa_don, id_ky",
      )
      .or(
        hd.nguonId
          ? `id_hoa_don.eq.${hd.id},id_ky.eq.${hd.nguonId}`
          : `id_hoa_don.eq.${hd.id}`,
      )
      .order("xac_nhan_luc", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[billing] dong org", error.message);
      return { ok: false, error: "Không đọc được bảng kê.", status: 500 };
    }

    type R = {
      id_don_hoc_phi: string | null;
      doanh_thu_vnd: number | string;
      ty_le: number | string;
      phi_vnd: number | string;
      loai_tru: boolean;
      ly_do_loai_tru: string | null;
      xac_nhan_luc: string;
    };
    const list = (rows ?? []) as R[];
    const donIds = [
      ...new Set(
        list.map((r) => r.id_don_hoc_phi).filter((x): x is string => Boolean(x)),
      ),
    ];
    const maMap = new Map<string, string>();
    if (donIds.length) {
      const { data: dons } = await admin
        .from("org_don_hoc_phi")
        .select("id, ma_don")
        .in("id", donIds);
      for (const d of (dons ?? []) as Array<{
        id: string;
        ma_don: string | null;
      }>) {
        if (d.ma_don) maMap.set(d.id, d.ma_don);
      }
    }

    const items: DongPhiItem[] = list.map((r) => ({
      thamChieu: r.id_don_hoc_phi
        ? maMap.get(r.id_don_hoc_phi) ?? r.id_don_hoc_phi.slice(0, 8)
        : null,
      ngay: r.xac_nhan_luc.slice(0, 10),
      doanhThuVnd: Math.round(Number(r.doanh_thu_vnd) || 0),
      tyLe: Number(r.ty_le) || 0,
      phiVnd: Math.round(Number(r.phi_vnd) || 0),
      loaiTru: Boolean(r.loai_tru),
      lyDoLoaiTru: r.ly_do_loai_tru,
    }));

    return {
      ok: true,
      data: {
        items,
        tong: tongItems(items),
        loai: "csdt_phi",
        tenDichVu: dv.tenHienThi ?? "Cơ sở",
      },
    };
  }

  return {
    ok: true,
    data: {
      items: [],
      tong: { doanhThuVnd: 0, phiVnd: 0, soDong: 0, soLoaiTru: 0 },
      loai: dv?.loai ?? "—",
      tenDichVu: dv?.tenHienThi ?? null,
    },
  };
}

function tongItems(items: DongPhiItem[]) {
  let doanhThuVnd = 0;
  let phiVnd = 0;
  let soLoaiTru = 0;
  for (const i of items) {
    if (i.loaiTru) {
      soLoaiTru += 1;
      continue;
    }
    doanhThuVnd += i.doanhThuVnd;
    phiVnd += i.phiVnd;
  }
  return {
    doanhThuVnd,
    phiVnd,
    soDong: items.length,
    soLoaiTru,
  };
}
