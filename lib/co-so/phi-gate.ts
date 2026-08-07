import "server-only";

import { hasStkNhanPhi, getCinsTaiChinh } from "@/lib/cins/tai-chinh-config";
import { anHanMapChoNguonIds } from "@/lib/billing/an-han";
import { tinhPhiLuyKeChuaVaoKy } from "@/lib/co-so/phi";
import {
  ensureCsdtPhiKyLazy,
  mapOrgPhiKy,
  type OrgPhiKyRow,
} from "@/lib/co-so/phi-ky";
import { tienPhaiTra } from "@/lib/co-so/phi-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const CSDT_PHI_QUA_HAN = "CSDT_PHI_QUA_HAN" as const;

export type CsdtPhiGateTrangThai =
  | "hoat_dong"
  | "canh_bao"
  | "khoa_ghi_danh";

export type CsdtPhiGate = {
  trangThai: CsdtPhiGateTrangThai;
  /** Đã qua kỳ kích hoạt chưa */
  daKichHoat: boolean;
  /** Phí lũy kế chưa vào kỳ (trước / giữa kỳ) */
  phiLuyKeChuaVaoKy: number;
  nguongKichHoatVnd: number;
  /** Có STK nhận phí trên admin chưa — không thì hoãn qua_han */
  coStkNhanPhi: boolean;
  kyQuaHan: OrgPhiKyRow[];
  kyChuaTra: OrgPhiKyRow[];
  tongNoVnd: number;
  hanTraGanNhat: string | null;
  maThamChieu: string | null;
  /** P0 C5: đang trong cửa sổ tự khai đã chuyển */
  tuKhaiTamMo: boolean;
  tuKhaiDenIso: string | null;
};

type KyDb = {
  id: string;
  id_to_chuc: string;
  loai_ky: "kich_hoat" | "thang";
  tu_ngay: string;
  den_ngay: string;
  ngay_chot: string;
  han_tra: string;
  doanh_thu_ghi_nhan_vnd: number | string;
  ty_le: number | string;
  phi_phai_tra_vnd: number | string;
  dieu_chinh_vnd: number | string;
  da_tra_vnd: number | string;
  trang_thai: OrgPhiKyRow["trangThai"];
  ma_tham_chieu: string;
  hoa_don_thong_tin?: unknown;
};

const KY_SELECT =
  "id, id_to_chuc, loai_ky, tu_ngay, den_ngay, ngay_chot, han_tra, doanh_thu_ghi_nhan_vnd, ty_le, phi_phai_tra_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai, ma_tham_chieu, hoa_don_thong_tin";

/**
 * Gate phí nền tảng CSĐT.
 * Lazy chạy ensure kỳ trước khi trả trạng thái (không cần cron để đúng logic).
 * Ân hạn tự khai đọc từ `cins_hoa_don` (Nhóm A).
 */
export async function getCsdtPhiGate(orgId: string): Promise<CsdtPhiGate> {
  await ensureCsdtPhiKyLazy(orgId);

  const cfg = await getCinsTaiChinh();
  const coStk = hasStkNhanPhi(cfg);
  const phiLuyKe = await tinhPhiLuyKeChuaVaoKy(orgId);
  const admin = createServiceRoleClient();
  const now = new Date();

  const [{ data: kichHoat }, { data: openKys }] = await Promise.all([
    admin
      .from("org_phi_ky")
      .select("id")
      .eq("id_to_chuc", orgId)
      .eq("loai_ky", "kich_hoat")
      .limit(1)
      .maybeSingle<{ id: string }>(),
    admin
      .from("org_phi_ky")
      .select(KY_SELECT)
      .eq("id_to_chuc", orgId)
      .in("trang_thai", ["chua_tra", "qua_han"])
      .order("han_tra", { ascending: true }),
  ]);

  const rows = ((openKys ?? []) as KyDb[]).map(mapOrgPhiKy);
  const rawRows = (openKys ?? []) as KyDb[];
  const kyQuaHan = rows.filter((k) => k.trangThai === "qua_han");
  const kyChuaTra = rows.filter((k) => k.trangThai === "chua_tra");

  let tongNo = 0;
  for (const k of rows) {
    const phai = tienPhaiTra(k.phiPhaiTraVnd, k.dieuChinhVnd);
    tongNo += Math.max(0, phai - k.daTraVnd);
  }

  const noGanNhat = rows[0] ?? null;

  /* Ân hạn: bất kỳ kỳ nợ nào còn tự khai hiệu lực trên hub → tạm không khóa ghi danh */
  const anHanMap = await anHanMapChoNguonIds({
    nguonBang: "org_phi_ky",
    nguonIds: rawRows.map((r) => r.id),
    now,
    soNgay: cfg.shop.soNgayAnHanTuKhai,
  });
  let tuKhaiTamMo = false;
  let tuKhaiDenIso: string | null = null;
  for (const raw of rawRows) {
    const ah = anHanMap.get(raw.id);
    if (!ah?.hieuLuc) continue;
    tuKhaiTamMo = true;
    if (ah.anHanDenIso && (!tuKhaiDenIso || ah.anHanDenIso > tuKhaiDenIso)) {
      tuKhaiDenIso = ah.anHanDenIso;
    }
  }

  let trangThai: CsdtPhiGateTrangThai = "hoat_dong";
  if (kyQuaHan.length > 0) {
    trangThai = tuKhaiTamMo ? "canh_bao" : "khoa_ghi_danh";
  } else if (kyChuaTra.length > 0) {
    trangThai = "canh_bao";
  }

  return {
    trangThai,
    daKichHoat: Boolean(kichHoat),
    phiLuyKeChuaVaoKy: phiLuyKe,
    nguongKichHoatVnd: cfg.csdt.nguongVnd,
    coStkNhanPhi: coStk,
    kyQuaHan,
    kyChuaTra,
    tongNoVnd: tongNo,
    hanTraGanNhat: noGanNhat?.hanTra ?? null,
    maThamChieu: noGanNhat?.maThamChieu ?? null,
    tuKhaiTamMo,
    tuKhaiDenIso,
  };
}

/** Chặn thêm ghi danh khi gate = khoa_ghi_danh. */
export async function assertCoTheThemGhiDanh(orgId: string): Promise<void> {
  const gate = await getCsdtPhiGate(orgId);
  if (gate.trangThai === "khoa_ghi_danh") {
    throw new Error(CSDT_PHI_QUA_HAN);
  }
}
