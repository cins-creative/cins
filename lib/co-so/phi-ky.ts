import "server-only";

import {
  getCinsTaiChinh,
  hasStkNhanPhi,
  type CinsTaiChinh,
} from "@/lib/cins/tai-chinh-config";
import { todayYmdVn } from "@/lib/co-so/ky-hoc";
import {
  addDaysYmd,
  hanTra,
  maThamChieu,
  roundVnd,
  thangKeTiepYmd,
  tienPhaiTra,
  ymdVnFromIso,
} from "@/lib/co-so/phi-config";
import { recalcKy, tinhPhiLuyKeChuaVaoKy } from "@/lib/co-so/phi";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type OrgPhiKyRow = {
  id: string;
  idToChuc: string;
  loaiKy: "kich_hoat" | "thang";
  tuNgay: string;
  denNgay: string;
  ngayChot: string;
  hanTra: string;
  doanhThuGhiNhanVnd: number;
  tyLe: number;
  phiPhaiTraVnd: number;
  dieuChinhVnd: number;
  daTraVnd: number;
  trangThai: "chua_tra" | "da_tra" | "qua_han" | "mien";
  maThamChieu: string;
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
};

const KY_SELECT =
  "id, id_to_chuc, loai_ky, tu_ngay, den_ngay, ngay_chot, han_tra, doanh_thu_ghi_nhan_vnd, ty_le, phi_phai_tra_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai, ma_tham_chieu";

export function mapOrgPhiKy(r: KyDb): OrgPhiKyRow {
  return {
    id: r.id,
    idToChuc: r.id_to_chuc,
    loaiKy: r.loai_ky,
    tuNgay: r.tu_ngay,
    denNgay: r.den_ngay,
    ngayChot: r.ngay_chot,
    hanTra: r.han_tra,
    doanhThuGhiNhanVnd: Number(r.doanh_thu_ghi_nhan_vnd) || 0,
    tyLe: Number(r.ty_le) || 0,
    phiPhaiTraVnd: Number(r.phi_phai_tra_vnd) || 0,
    dieuChinhVnd: Number(r.dieu_chinh_vnd) || 0,
    daTraVnd: Number(r.da_tra_vnd) || 0,
    trangThai: r.trang_thai,
    maThamChieu: r.ma_tham_chieu,
  };
}

type DongAgg = {
  doanhThu: number;
  phi: number;
  tyLeSum: number;
  n: number;
  minYmd: string | null;
  maxYmd: string | null;
};

async function aggregateDongChuaVaoKy(
  orgId: string,
  opts?: { tuNgay?: string; denNgay?: string },
): Promise<DongAgg> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_phi_dong")
    .select("doanh_thu_vnd, phi_vnd, ty_le, xac_nhan_luc")
    .eq("id_to_chuc", orgId)
    .is("id_ky", null)
    .eq("loai_tru", false);

  if (error) {
    console.error("[csdt-phi] aggregateDong", error.message);
    return {
      doanhThu: 0,
      phi: 0,
      tyLeSum: 0,
      n: 0,
      minYmd: null,
      maxYmd: null,
    };
  }

  let doanhThu = 0;
  let phi = 0;
  let tyLeSum = 0;
  let n = 0;
  let minYmd: string | null = null;
  let maxYmd: string | null = null;

  for (const row of (data ?? []) as Array<{
    doanh_thu_vnd: number | string;
    phi_vnd: number | string;
    ty_le: number | string;
    xac_nhan_luc: string;
  }>) {
    const ymd = ymdVnFromIso(row.xac_nhan_luc);
    if (opts?.tuNgay && ymd < opts.tuNgay) continue;
    if (opts?.denNgay && ymd > opts.denNgay) continue;
    doanhThu += Number(row.doanh_thu_vnd) || 0;
    phi += Number(row.phi_vnd) || 0;
    tyLeSum += Number(row.ty_le) || 0;
    n += 1;
    if (!minYmd || ymd < minYmd) minYmd = ymd;
    if (!maxYmd || ymd > maxYmd) maxYmd = ymd;
  }

  return { doanhThu, phi, tyLeSum, n, minYmd, maxYmd };
}

async function ganDongVaoKy(
  orgId: string,
  kyId: string,
  opts?: { tuNgay?: string; denNgay?: string },
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: dongs } = await admin
    .from("org_phi_dong")
    .select("id, xac_nhan_luc")
    .eq("id_to_chuc", orgId)
    .is("id_ky", null)
    .eq("loai_tru", false);

  const ids: string[] = [];
  for (const d of (dongs ?? []) as Array<{ id: string; xac_nhan_luc: string }>) {
    const ymd = ymdVnFromIso(d.xac_nhan_luc);
    if (opts?.tuNgay && ymd < opts.tuNgay) continue;
    if (opts?.denNgay && ymd > opts.denNgay) continue;
    ids.push(d.id);
  }
  if (ids.length === 0) return;

  for (let i = 0; i < ids.length; i += 100) {
    const slice = ids.slice(i, i + 100);
    await admin.from("org_phi_dong").update({ id_ky: kyId }).in("id", slice);
  }
  await recalcKy(kyId);
}

async function buildHoaDonSnapshot(
  orgId: string,
  cfg: CinsTaiChinh,
  input: { tuNgay: string; ngayChot: string; donGiaVnd: number },
): Promise<Record<string, unknown>> {
  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("ten, cau_hinh")
    .eq("id", orgId)
    .maybeSingle<{ ten: string; cau_hinh: unknown }>();

  const cau =
    org?.cau_hinh &&
    typeof org.cau_hinh === "object" &&
    !Array.isArray(org.cau_hinh)
      ? (org.cau_hinh as Record<string, unknown>)
      : {};
  const hoaDon =
    cau.hoa_don &&
    typeof cau.hoa_don === "object" &&
    !Array.isArray(cau.hoa_don)
      ? (cau.hoa_don as Record<string, unknown>)
      : {};

  return {
    ben_ban: {
      ten_phap_nhan: cfg.doanhNghiep.tenPhapNhan,
      mst: cfg.doanhNghiep.mst,
      dia_chi: cfg.doanhNghiep.diaChi,
      nguoi_dai_dien: cfg.doanhNghiep.nguoiDaiDien,
      email_hoa_don: cfg.doanhNghiep.emailHoaDon,
    },
    ben_mua: {
      ten_org: org?.ten ?? null,
      ten_phap_nhan:
        typeof hoaDon.ten_phap_nhan === "string" ? hoaDon.ten_phap_nhan : null,
      mst: typeof hoaDon.mst === "string" ? hoaDon.mst : null,
      dia_chi: typeof hoaDon.dia_chi === "string" ? hoaDon.dia_chi : null,
      email_nhan_hoa_don:
        typeof hoaDon.email_nhan_hoa_don === "string"
          ? hoaDon.email_nhan_hoa_don
          : null,
    },
    dich_vu: `Phí sử dụng nền tảng CINs kỳ ${input.tuNgay}–${input.ngayChot}`,
    so_luong: 1,
    don_gia_vnd: input.donGiaVnd,
    thue_suat: null,
  };
}

async function insertKy(input: {
  orgId: string;
  loaiKy: "kich_hoat" | "thang";
  tuNgay: string;
  denNgay: string;
  ngayChot: string;
  doanhThu: number;
  tyLe: number;
  phi: number;
  cfg: CinsTaiChinh;
}): Promise<OrgPhiKyRow | null> {
  const admin = createServiceRoleClient();
  const soNgay = input.cfg.csdt.soNgayHanTra;
  const han = hanTra(input.ngayChot, soNgay);
  const phaiTra = roundVnd(input.phi);
  const trangThai: OrgPhiKyRow["trangThai"] =
    phaiTra <= 0 ? "mien" : "chua_tra";
  const ma = maThamChieu(input.orgId, input.ngayChot);
  const now = new Date().toISOString();
  const snapshot = await buildHoaDonSnapshot(input.orgId, input.cfg, {
    tuNgay: input.tuNgay,
    ngayChot: input.ngayChot,
    donGiaVnd: phaiTra,
  });

  const { data, error } = await admin
    .from("org_phi_ky")
    .insert({
      id_to_chuc: input.orgId,
      loai_ky: input.loaiKy,
      tu_ngay: input.tuNgay,
      den_ngay: input.denNgay,
      ngay_chot: input.ngayChot,
      han_tra: han,
      doanh_thu_ghi_nhan_vnd: roundVnd(input.doanhThu),
      ty_le: input.tyLe,
      phi_phai_tra_vnd: phaiTra,
      dieu_chinh_vnd: 0,
      da_tra_vnd: 0,
      trang_thai: trangThai,
      ma_tham_chieu: ma,
      hoa_don_thong_tin: snapshot,
      tao_luc: now,
      cap_nhat_luc: now,
    })
    .select(KY_SELECT)
    .single<KyDb>();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await admin
        .from("org_phi_ky")
        .select(KY_SELECT)
        .eq("id_to_chuc", input.orgId)
        .eq("ngay_chot", input.ngayChot)
        .maybeSingle<KyDb>();
      return existing ? mapOrgPhiKy(existing) : null;
    }
    console.error("[csdt-phi] insertKy", error.message);
    return null;
  }
  return data ? mapOrgPhiKy(data) : null;
}

/**
 * Phí lũy kế (id_ky IS NULL) ≥ ngưỡng → tạo kỳ `kich_hoat`, gom mọi dòng chưa vào kỳ.
 */
export async function ensureKyKichHoat(
  orgId: string,
  now = new Date(),
): Promise<OrgPhiKyRow | null> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("org_phi_ky")
    .select(KY_SELECT)
    .eq("id_to_chuc", orgId)
    .eq("loai_ky", "kich_hoat")
    .limit(1)
    .maybeSingle<KyDb>();
  if (existing) return mapOrgPhiKy(existing);

  const cfg = await getCinsTaiChinh();
  const luyKe = await tinhPhiLuyKeChuaVaoKy(orgId);
  if (luyKe < cfg.csdt.nguongVnd) return null;

  const agg = await aggregateDongChuaVaoKy(orgId);
  if (agg.n === 0) return null;

  const today = todayYmdVn(now);
  const tuNgay = agg.minYmd ?? today;
  const denNgay = agg.maxYmd && agg.maxYmd > today ? agg.maxYmd : today;
  const tyLe =
    agg.n > 0 ? Number((agg.tyLeSum / agg.n).toFixed(4)) : cfg.csdt.tyLe;

  const ky = await insertKy({
    orgId,
    loaiKy: "kich_hoat",
    tuNgay,
    denNgay,
    ngayChot: today,
    doanhThu: agg.doanhThu,
    tyLe,
    phi: agg.phi,
    cfg,
  });
  if (!ky) return null;

  await ganDongVaoKy(orgId, ky.id);
  return ky;
}

/**
 * Sau kích hoạt: tạo kỳ tháng đã tới ngày chốt (bù nhiều tháng nếu bỏ lỡ).
 * VD kích hoạt 8/3 → kỳ tháng đầu chốt 30/4 → 31/5…
 */
export async function ensureKyThang(
  orgId: string,
  now = new Date(),
): Promise<OrgPhiKyRow[]> {
  const admin = createServiceRoleClient();
  const { data: kichHoat } = await admin
    .from("org_phi_ky")
    .select(KY_SELECT)
    .eq("id_to_chuc", orgId)
    .eq("loai_ky", "kich_hoat")
    .order("ngay_chot", { ascending: true })
    .limit(1)
    .maybeSingle<KyDb>();
  if (!kichHoat) return [];

  const cfg = await getCinsTaiChinh();
  const today = todayYmdVn(now);
  const ngayKichHoat = kichHoat.ngay_chot;

  const { data: allKy } = await admin
    .from("org_phi_ky")
    .select("ngay_chot, loai_ky")
    .eq("id_to_chuc", orgId)
    .order("ngay_chot", { ascending: true });

  const chotSet = new Set(
    ((allKy ?? []) as Array<{ ngay_chot: string }>).map((k) => k.ngay_chot),
  );
  const hasThang = ((allKy ?? []) as Array<{ loai_ky: string }>).some(
    (k) => k.loai_ky === "thang",
  );

  let cursorChot: string;
  let cursorTu: string;

  if (!hasThang) {
    cursorTu = addDaysYmd(ngayKichHoat, 1);
    cursorChot = thangKeTiepYmd(ngayKichHoat);
  } else {
    const lastChot = ((allKy ?? []) as Array<{ ngay_chot: string }>).reduce(
      (max, k) => (k.ngay_chot > max ? k.ngay_chot : max),
      ngayKichHoat,
    );
    cursorTu = addDaysYmd(lastChot, 1);
    cursorChot = thangKeTiepYmd(lastChot);
  }

  const created: OrgPhiKyRow[] = [];
  for (let i = 0; i < 36; i++) {
    if (cursorChot > today) break;

    if (!chotSet.has(cursorChot)) {
      const agg = await aggregateDongChuaVaoKy(orgId, {
        tuNgay: cursorTu,
        denNgay: cursorChot,
      });
      const tyLe =
        agg.n > 0 ? Number((agg.tyLeSum / agg.n).toFixed(4)) : cfg.csdt.tyLe;

      const ky = await insertKy({
        orgId,
        loaiKy: "thang",
        tuNgay: cursorTu,
        denNgay: cursorChot,
        ngayChot: cursorChot,
        doanhThu: agg.doanhThu,
        tyLe,
        phi: agg.phi,
        cfg,
      });
      if (ky) {
        await ganDongVaoKy(orgId, ky.id, {
          tuNgay: cursorTu,
          denNgay: cursorChot,
        });
        created.push(ky);
        chotSet.add(cursorChot);
      }
    }

    cursorTu = addDaysYmd(cursorChot, 1);
    cursorChot = thangKeTiepYmd(cursorChot);
  }

  return created;
}

/**
 * Cập nhật trạng thái kỳ: đủ tiền → da_tra; quá hạn (có STK) → qua_han; phi=0 → mien.
 * Trả các kỳ **vừa** chuyển sang `qua_han` (để cron gửi noti).
 */
export async function capNhatTrangThaiKy(
  orgId: string,
  now = new Date(),
): Promise<{ quaHanMoi: OrgPhiKyRow[] }> {
  const admin = createServiceRoleClient();
  const cfg = await getCinsTaiChinh();
  const stkOk = hasStkNhanPhi(cfg);
  const today = todayYmdVn(now);
  const quaHanMoi: OrgPhiKyRow[] = [];

  const { data: kys } = await admin
    .from("org_phi_ky")
    .select(KY_SELECT)
    .eq("id_to_chuc", orgId)
    .in("trang_thai", ["chua_tra", "qua_han", "mien"]);

  for (const raw of (kys ?? []) as KyDb[]) {
    const ky = mapOrgPhiKy(raw);
    const phaiTra = tienPhaiTra(ky.phiPhaiTraVnd, ky.dieuChinhVnd);
    let next = ky.trangThai;

    if (phaiTra <= 0) {
      next = "mien";
    } else if (ky.daTraVnd >= phaiTra) {
      next = "da_tra";
    } else if (stkOk && today > ky.hanTra) {
      next = "qua_han";
    } else {
      next = "chua_tra";
    }

    if (next !== ky.trangThai) {
      await admin
        .from("org_phi_ky")
        .update({
          trang_thai: next,
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", ky.id);
      if (next === "qua_han" && ky.trangThai !== "qua_han") {
        quaHanMoi.push({ ...ky, trangThai: "qua_han" });
      }
    }
  }

  return { quaHanMoi };
}

/** Lazy: kích hoạt + chốt tháng + cập nhật trạng thái. */
export async function ensureCsdtPhiKyLazy(
  orgId: string,
  now = new Date(),
): Promise<void> {
  await ensureKyKichHoat(orgId, now);
  await ensureKyThang(orgId, now);
  await capNhatTrangThaiKy(orgId, now);
}

/** Danh sách kỳ phí (mới → cũ). */
export async function listOrgPhiKy(
  orgId: string,
  limit = 24,
): Promise<OrgPhiKyRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_phi_ky")
    .select(KY_SELECT)
    .eq("id_to_chuc", orgId)
    .order("ngay_chot", { ascending: false })
    .limit(Math.min(48, Math.max(1, limit)));
  if (error) {
    console.error("[csdt-phi] listOrgPhiKy", error.message);
    return [];
  }
  return ((data ?? []) as KyDb[]).map(mapOrgPhiKy);
}
