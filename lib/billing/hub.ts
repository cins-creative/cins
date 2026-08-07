import "server-only";

import { getCinsTaiChinh, hasStkNhanPhi } from "@/lib/cins/tai-chinh-config";
import { listOrgPhiKy } from "@/lib/co-so/phi-ky";
import { listPhiKyForSeller } from "@/lib/shop/phi";
import { buildVietQrImageUrl } from "@/lib/shop/vietqr";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  adaptOrgPhiKyToHoaDon,
  adaptShopPhiKyToHoaDon,
  pickUuTienThanhToan,
  sortHoaDon,
} from "./hoa-don-adapter";
import { listHoaDonForTk, toHubHoaDon, enrichHoaDonChiTietKy } from "./hoa-don";
import { ensureBillingLinksForUser } from "./ensure-links";
import { enrichTheoDichVu } from "./enrich-dich-vu";
import { listKhieuNaiForTk } from "./khieu-nai";
import {
  canSuaTk,
  findAccessibleTkForUser,
  listDichVuForTk,
  listPhuTrach,
} from "./tk";
import type {
  BillingHubPayload,
  CinsDichVu,
  DichVuNoTong,
  HoaDon,
} from "./types";

async function tenChoDichVu(dv: CinsDichVu): Promise<string> {
  const admin = createServiceRoleClient();
  if (dv.loai === "csdt_phi") {
    const { data } = await admin
      .from("org_to_chuc")
      .select("ten")
      .eq("id", dv.thamChieuId)
      .maybeSingle<{ ten: string | null }>();
    return data?.ten?.trim() || "Cơ sở đào tạo";
  }
  if (dv.loai === "shop_phi") {
    const { data } = await admin
      .from("shop_cua_hang")
      .select("ten")
      .eq("id_nguoi_dung", dv.thamChieuId)
      .maybeSingle<{ ten: string | null }>();
    return data?.ten?.trim() || "Shop";
  }
  return "Ads";
}

async function loadHoaDonChoDichVu(
  dv: CinsDichVu,
  ten: string,
): Promise<HoaDon[]> {
  if (dv.loai === "csdt_phi") {
    const kys = await listOrgPhiKy(dv.thamChieuId, 24);
    return kys.map((ky) =>
      adaptOrgPhiKyToHoaDon(ky, { idDichVu: dv.id, tenDichVu: ten }),
    );
  }
  if (dv.loai === "shop_phi") {
    const kys = await listPhiKyForSeller(dv.thamChieuId, 24);
    return kys.map((ky) =>
      adaptShopPhiKyToHoaDon(ky, { idDichVu: dv.id, tenDichVu: ten }),
    );
  }
  return [];
}

/** Hub billing cho user đang đăng nhập (owner hoặc phụ trách). */
export async function getBillingHubForUser(
  userId: string,
): Promise<BillingHubPayload> {
  /* Lazy gắn dòng dịch vụ trước khi đọc. */
  try {
    await ensureBillingLinksForUser(userId);
  } catch (e) {
    console.error(
      "[billing] ensureLinks",
      e instanceof Error ? e.message : e,
    );
  }

  const access = await findAccessibleTkForUser(userId);
  const cfg = await getCinsTaiChinh();
  const phiCongKhai: BillingHubPayload["phiCongKhai"] = {
    shopTyLe: cfg.shop.tyLe,
    shopToiThieuXuatKyVnd: cfg.shop.toiThieuXuatKyVnd,
    csdtTyLe: cfg.csdt.tyLe,
    csdtNguongVnd: cfg.csdt.nguongVnd,
  };
  const emptyThanhToan: BillingHubPayload["thanhToan"] = {
    available: false,
    bank: null,
    maThamChieu: null,
    soTienVnd: null,
    hanTra: null,
    qrUrl: null,
    hoaDonId: null,
  };

  if (!access) {
    return {
      tk: null,
      laChu: true,
      canSua: false,
      tongNoVnd: 0,
      hanTraGanNhat: null,
      theoDichVu: [],
      hoaDon: [],
      phiCongKhai,
      thanhToan: emptyThanhToan,
      phuTrach: [],
      khieuNai: [],
    };
  }

  const { tk, laChu } = access;
  const canSua = await canSuaTk(tk.id, userId);
  const dichVus = await listDichVuForTk(tk.id);
  const tens = await Promise.all(dichVus.map((dv) => tenChoDichVu(dv)));
  const withTen: CinsDichVu[] = dichVus.map((dv, i) => {
    const tyLeFallback =
      dv.loai === "shop_phi"
        ? phiCongKhai.shopTyLe
        : dv.loai === "csdt_phi"
          ? phiCongKhai.csdtTyLe
          : null;
    return {
      ...dv,
      tenHienThi: tens[i],
      tyLe: dv.tyLe != null ? dv.tyLe : tyLeFallback,
      nguongChotVnd:
        dv.nguongChotVnd != null
          ? dv.nguongChotVnd
          : dv.loai === "csdt_phi"
            ? phiCongKhai.csdtNguongVnd
            : dv.nguongChotVnd,
      toiThieuXuatKyVnd:
        dv.toiThieuXuatKyVnd != null
          ? dv.toiThieuXuatKyVnd
          : dv.loai === "shop_phi"
            ? phiCongKhai.shopToiThieuXuatKyVnd
            : dv.toiThieuXuatKyVnd,
    };
  });

  /* P2: ưu tiên cins_hoa_don; fallback adapter nguồn cũ. */
  const unified = await listHoaDonForTk(tk.id, 48);
  let hoaDon: HoaDon[];
  let theoDichVu: DichVuNoTong[];

  if (unified.length > 0) {
    const dvMap = new Map(withTen.map((d) => [d.id, d]));
    const soNgayAnHan = cfg.shop.soNgayAnHanTuKhai;
    hoaDon = (
      await enrichHoaDonChiTietKy(
        unified.map((r) => {
          const dv = dvMap.get(r.idDichVu);
          return toHubHoaDon(r, {
            loai: dv?.loai ?? "csdt_phi",
            thamChieuId: dv?.thamChieuId ?? "",
            tenDichVu: dv?.tenHienThi || "Dịch vụ",
            tyLe: dv?.tyLe ?? null,
            soNgayAnHan,
          });
        }),
      )
    ).sort(sortHoaDon);

    theoDichVu = withTen.map((dv) => {
      const list = hoaDon.filter((h) => h.idDichVu === dv.id);
      const noList = list.filter((h) => h.conNoVnd > 0);
      const tongNoVnd = noList.reduce((s, h) => s + h.conNoVnd, 0);
      const hans = noList
        .map((h) => h.hanTra)
        .filter((x): x is string => Boolean(x))
        .sort();
      return {
        dichVu: dv,
        tongNoVnd,
        hanTraGanNhat: hans[0] ?? null,
        soKyNo: noList.length,
      };
    });
  } else {
    const hoaDonLists = await Promise.all(
      withTen.map((dv) => loadHoaDonChoDichVu(dv, dv.tenHienThi || "")),
    );
    hoaDon = hoaDonLists.flat().sort(sortHoaDon);
    theoDichVu = withTen.map((dv, i) => {
      const list = hoaDonLists[i] ?? [];
      const noList = list.filter((h) => h.conNoVnd > 0);
      const tongNoVnd = noList.reduce((s, h) => s + h.conNoVnd, 0);
      const hans = noList
        .map((h) => h.hanTra)
        .filter((x): x is string => Boolean(x))
        .sort();
      return {
        dichVu: dv,
        tongNoVnd,
        hanTraGanNhat: hans[0] ?? null,
        soKyNo: noList.length,
      };
    });
  }

  const tongNoVnd = theoDichVu.reduce((s, d) => s + d.tongNoVnd, 0);
  const allHans = theoDichVu
    .map((d) => d.hanTraGanNhat)
    .filter((x): x is string => Boolean(x))
    .sort();
  const hanTraGanNhat = allHans[0] ?? null;

  theoDichVu = await enrichTheoDichVu(theoDichVu);

  const uuTien = pickUuTienThanhToan(hoaDon);
  const coStk = hasStkNhanPhi(cfg);
  let qrUrl: string | null = null;
  if (coStk && uuTien && uuTien.conNoVnd > 0 && uuTien.maThamChieu) {
    qrUrl = buildVietQrImageUrl({
      nganHang: cfg.bank.bin || cfg.bank.ten || "",
      soTaiKhoan: cfg.bank.soTk || "",
      amountVnd: uuTien.conNoVnd,
      addInfo: uuTien.maThamChieu,
    });
  }

  const phuTrach = laChu ? await listPhuTrach(tk.id) : [];
  const knRows = await listKhieuNaiForTk(tk.id);
  const khieuNai = knRows.map((k) => ({
    id: k.id,
    nguon: k.nguon,
    idHoaDon: k.idHoaDon,
    idDichVu: k.idDichVu,
    orgId: k.orgId,
    loai: k.loai,
    noiDung: k.noiDung,
    maGiaoDich: k.maGiaoDich,
    anhIds: k.anhIds,
    trangThai: k.trangThai,
    phanHoiAdmin: k.phanHoiAdmin,
    taoLuc: k.taoLuc,
    tenDichVu: k.tenDichVu,
  }));

  return {
    tk,
    laChu,
    canSua,
    tongNoVnd,
    hanTraGanNhat,
    theoDichVu,
    hoaDon,
    phiCongKhai,
    thanhToan: {
      available: coStk,
      bank: coStk
        ? {
            ten: cfg.bank.ten,
            soTk: cfg.bank.soTk,
            chuTk: cfg.bank.chuTk,
            bin: cfg.bank.bin,
          }
        : null,
      maThamChieu: uuTien?.maThamChieu ?? null,
      soTienVnd: uuTien && uuTien.conNoVnd > 0 ? uuTien.conNoVnd : null,
      hanTra: uuTien?.hanTra ?? null,
      qrUrl,
      hoaDonId: uuTien?.id ?? null,
    },
    phuTrach,
    khieuNai,
  };
}
