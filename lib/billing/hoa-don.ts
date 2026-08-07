import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  anHanConHieuLuc,
  anHanDenIso,
  coTheTuKhai,
  getSoNgayAnHanTuKhai,
} from "./an-han";
import { conNoHoaDon, maThamChieuHoaDon } from "./hoa-don-ma";
import type { HoaDon, HoaDonTrangThai } from "./types";

export type CinsHoaDonRow = {
  id: string;
  idTk: string;
  idDichVu: string;
  tuNgay: string;
  denNgay: string;
  ngayChot: string;
  thongBaoLuc: string;
  hanTra: string;
  soTienVnd: number;
  dieuChinhVnd: number;
  daTraVnd: number;
  trangThai: HoaDonTrangThai | "ngung_theo_doi";
  maThamChieu: string;
  tuKhaiDaTraLuc: string | null;
  tuKhaiLan: number;
  tuKhaiBoi: string | null;
  nguonBang: "org_phi_ky" | "shop_phi_ky" | null;
  nguonId: string | null;
  hoaDonThongTin?: Record<string, unknown> | null;
};

type HdDb = {
  id: string;
  id_tk: string;
  id_dich_vu: string;
  tu_ngay: string;
  den_ngay: string;
  ngay_chot: string;
  thong_bao_luc: string;
  han_tra: string;
  so_tien_vnd: number | string;
  dieu_chinh_vnd: number | string;
  da_tra_vnd: number | string;
  trang_thai: CinsHoaDonRow["trangThai"];
  ma_tham_chieu: string;
  tu_khai_da_tra_luc: string | null;
  tu_khai_lan: number | string | null;
  tu_khai_boi: string | null;
  nguon_bang: "org_phi_ky" | "shop_phi_ky" | null;
  nguon_id: string | null;
  hoa_don_thong_tin?: Record<string, unknown> | null;
};

const HD_SELECT =
  "id, id_tk, id_dich_vu, tu_ngay, den_ngay, ngay_chot, thong_bao_luc, han_tra, so_tien_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai, ma_tham_chieu, tu_khai_da_tra_luc, tu_khai_lan, tu_khai_boi, nguon_bang, nguon_id, hoa_don_thong_tin";

function numFromTt(
  tt: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number | null {
  if (!tt) return null;
  for (const k of keys) {
    const v = tt[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
      return Number(v);
    }
  }
  return null;
}

export function mapHoaDonDb(r: HdDb): CinsHoaDonRow {
  return {
    id: r.id,
    idTk: r.id_tk,
    idDichVu: r.id_dich_vu,
    tuNgay: r.tu_ngay,
    denNgay: r.den_ngay,
    ngayChot: r.ngay_chot,
    thongBaoLuc: r.thong_bao_luc,
    hanTra: r.han_tra,
    soTienVnd: Number(r.so_tien_vnd) || 0,
    dieuChinhVnd: Number(r.dieu_chinh_vnd) || 0,
    daTraVnd: Number(r.da_tra_vnd) || 0,
    trangThai: r.trang_thai,
    maThamChieu: r.ma_tham_chieu,
    tuKhaiDaTraLuc: r.tu_khai_da_tra_luc,
    tuKhaiLan: Math.max(0, Math.floor(Number(r.tu_khai_lan) || 0)),
    tuKhaiBoi: r.tu_khai_boi,
    nguonBang: r.nguon_bang,
    nguonId: r.nguon_id,
    hoaDonThongTin:
      r.hoa_don_thong_tin && typeof r.hoa_don_thong_tin === "object"
        ? (r.hoa_don_thong_tin as Record<string, unknown>)
        : null,
  };
}

export function toHubHoaDon(
  r: CinsHoaDonRow,
  meta: {
    loai: HoaDon["loai"];
    thamChieuId: string;
    tenDichVu: string;
    doanhThuVnd?: number | null;
    tyLe?: number | null;
    soNgayAnHan?: number;
  },
): HoaDon {
  const trangThai =
    r.trangThai === "ngung_theo_doi"
      ? ("mien" as const)
      : (r.trangThai as HoaDon["trangThai"]);
  const tt = r.hoaDonThongTin;
  const doanhThuFromTt = numFromTt(
    tt,
    "doanhThuVnd",
    "gmv",
    "gmvGhiNhan",
    "doanh_thu_vnd",
  );
  const tyLeFromTt = numFromTt(tt, "tyLe", "ty_le");
  const soNgay = meta.soNgayAnHan ?? 3;
  const coThe = coTheTuKhai({
    trangThai: r.trangThai,
    tuKhaiLan: r.tuKhaiLan,
    tuKhaiDaTraLuc: r.tuKhaiDaTraLuc,
  });
  const hieuLuc = anHanConHieuLuc(
    { tuKhaiDaTraLuc: r.tuKhaiDaTraLuc },
    soNgay,
  );
  return {
    id: r.id,
    nguon: r.nguonBang === "shop_phi_ky" ? "shop_phi_ky" : "org_phi_ky",
    idDichVu: r.idDichVu,
    loai: meta.loai,
    thamChieuId: meta.thamChieuId,
    tenDichVu: meta.tenDichVu,
    tuNgay: r.tuNgay,
    denNgay: r.denNgay,
    ngayChot: r.ngayChot,
    hanTra: r.hanTra,
    doanhThuVnd: meta.doanhThuVnd ?? doanhThuFromTt,
    tyLe: meta.tyLe ?? tyLeFromTt,
    soTienVnd: Math.max(
      0,
      r.soTienVnd + Math.round(r.dieuChinhVnd),
    ),
    dieuChinhVnd: r.dieuChinhVnd,
    daTraVnd: r.daTraVnd,
    conNoVnd: conNoHoaDon(r),
    trangThai,
    maThamChieu: r.maThamChieu,
    nguonId: r.nguonId,
    coTheTuKhai: coThe.ok,
    anHanDenIso: hieuLuc
      ? anHanDenIso(r.tuKhaiDaTraLuc, soNgay)
      : null,
    tuKhaiLan: r.tuKhaiLan,
  };
}

export async function getHoaDonById(
  id: string,
): Promise<CinsHoaDonRow | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_hoa_don")
    .select(HD_SELECT)
    .eq("id", id)
    .maybeSingle<HdDb>();
  if (error) {
    console.error("[billing] getHoaDonById", error.message);
    return null;
  }
  return data ? mapHoaDonDb(data) : null;
}

export async function listHoaDonForTk(
  tkId: string,
  limit = 48,
): Promise<CinsHoaDonRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_hoa_don")
    .select(HD_SELECT)
    .eq("id_tk", tkId)
    .order("han_tra", { ascending: true })
    .limit(Math.min(100, Math.max(1, limit)));
  if (error) {
    console.error("[billing] listHoaDon", error.message);
    return [];
  }
  return ((data ?? []) as HdDb[]).map(mapHoaDonDb);
}

/**
 * Bổ sung GMV / doanh thu + ty_le từ kỳ nguồn (shop_phi_ky / org_phi_ky).
 * cins_hoa_don chưa lưu các cột này — đọc theo nguon_id.
 */
export async function enrichHoaDonChiTietKy(
  list: HoaDon[],
): Promise<HoaDon[]> {
  if (list.length === 0) return list;
  const admin = createServiceRoleClient();
  const shopIds = [
    ...new Set(
      list
        .filter((h) => h.nguon === "shop_phi_ky" && h.nguonId)
        .map((h) => h.nguonId as string),
    ),
  ];
  const orgIds = [
    ...new Set(
      list
        .filter((h) => h.nguon === "org_phi_ky" && h.nguonId)
        .map((h) => h.nguonId as string),
    ),
  ];

  const shopMap = new Map<string, { gmv: number; tyLe: number }>();
  const orgMap = new Map<string, { doanhThu: number; tyLe: number }>();

  if (shopIds.length > 0) {
    const { data, error } = await admin
      .from("shop_phi_ky")
      .select("id, gmv_ghi_nhan, ty_le")
      .in("id", shopIds);
    if (error) {
      console.error("[billing] enrich shop_phi_ky", error.message);
    }
    for (const r of (data ?? []) as Array<{
      id: string;
      gmv_ghi_nhan: number | string;
      ty_le: number | string;
    }>) {
      shopMap.set(r.id, {
        gmv: Number(r.gmv_ghi_nhan) || 0,
        tyLe: Number(r.ty_le) || 0,
      });
    }
  }
  if (orgIds.length > 0) {
    const { data, error } = await admin
      .from("org_phi_ky")
      .select("id, doanh_thu_ghi_nhan_vnd, ty_le")
      .in("id", orgIds);
    if (error) {
      console.error("[billing] enrich org_phi_ky", error.message);
    }
    for (const r of (data ?? []) as Array<{
      id: string;
      doanh_thu_ghi_nhan_vnd: number | string;
      ty_le: number | string;
    }>) {
      orgMap.set(r.id, {
        doanhThu: Number(r.doanh_thu_ghi_nhan_vnd) || 0,
        tyLe: Number(r.ty_le) || 0,
      });
    }
  }

  return list.map((h) => {
    if (!h.nguonId) return h;
    if (h.nguon === "shop_phi_ky") {
      const s = shopMap.get(h.nguonId);
      if (!s) return h;
      return {
        ...h,
        doanhThuVnd: s.gmv,
        tyLe: s.tyLe,
      };
    }
    const o = orgMap.get(h.nguonId);
    if (!o) return h;
    return {
      ...h,
      doanhThuVnd: o.doanhThu,
      tyLe: o.tyLe,
    };
  });
}

export async function getHoaDonByMa(
  ma: string,
): Promise<CinsHoaDonRow | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("cins_hoa_don")
    .select(HD_SELECT)
    .eq("ma_tham_chieu", ma.toUpperCase())
    .maybeSingle<HdDb>();
  return data ? mapHoaDonDb(data) : null;
}

/** Tạo hoặc cập nhật hoá đơn theo (nguon_bang, nguon_id) — dual-write / backfill. */
export async function upsertHoaDonTuNguon(input: {
  idTk: string;
  idDichVu: string;
  tuNgay: string;
  denNgay: string;
  ngayChot: string;
  hanTra: string;
  soTienVnd: number;
  dieuChinhVnd?: number;
  daTraVnd?: number;
  trangThai: CinsHoaDonRow["trangThai"];
  nguonBang: "org_phi_ky" | "shop_phi_ky";
  nguonId: string;
  seedMa: string;
  /** Giữ mã CK nguồn cũ (org/shop) để Sepay/QR không lệch. */
  maThamChieu?: string | null;
  thongBaoLuc?: string;
  hoaDonThongTin?: Record<string, unknown> | null;
}): Promise<CinsHoaDonRow> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("cins_hoa_don")
    .select(HD_SELECT)
    .eq("nguon_bang", input.nguonBang)
    .eq("nguon_id", input.nguonId)
    .maybeSingle<HdDb>();

  const now = new Date().toISOString();
  if (existing) {
    const prevTt =
      existing.hoa_don_thong_tin &&
      typeof existing.hoa_don_thong_tin === "object"
        ? (existing.hoa_don_thong_tin as Record<string, unknown>)
        : {};
    const nextTt = input.hoaDonThongTin
      ? { ...prevTt, ...input.hoaDonThongTin }
      : undefined;
    const { data, error } = await admin
      .from("cins_hoa_don")
      .update({
        so_tien_vnd: input.soTienVnd,
        dieu_chinh_vnd: input.dieuChinhVnd ?? 0,
        da_tra_vnd: input.daTraVnd ?? existing.da_tra_vnd,
        trang_thai: input.trangThai,
        han_tra: input.hanTra,
        tu_ngay: input.tuNgay,
        den_ngay: input.denNgay,
        ngay_chot: input.ngayChot,
        hoa_don_thong_tin: nextTt,
        cap_nhat_luc: now,
      })
      .eq("id", existing.id)
      .select(HD_SELECT)
      .single<HdDb>();
    if (error || !data) throw new Error(error?.message ?? "UPDATE_HD_FAILED");
    return mapHoaDonDb(data);
  }

  let lastErr = "CREATE_HD_FAILED";
  const preferred = input.maThamChieu?.trim().toUpperCase() || null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const ma =
      attempt === 0 && preferred
        ? preferred
        : maThamChieuHoaDon(input.seedMa, input.ngayChot, attempt);
    const { data, error } = await admin
      .from("cins_hoa_don")
      .insert({
        id_tk: input.idTk,
        id_dich_vu: input.idDichVu,
        tu_ngay: input.tuNgay,
        den_ngay: input.denNgay,
        ngay_chot: input.ngayChot,
        thong_bao_luc: input.thongBaoLuc ?? now,
        han_tra: input.hanTra,
        so_tien_vnd: input.soTienVnd,
        dieu_chinh_vnd: input.dieuChinhVnd ?? 0,
        da_tra_vnd: input.daTraVnd ?? 0,
        trang_thai: input.trangThai,
        ma_tham_chieu: ma,
        hoa_don_thong_tin: input.hoaDonThongTin ?? null,
        nguon_bang: input.nguonBang,
        nguon_id: input.nguonId,
        tao_luc: now,
        cap_nhat_luc: now,
      })
      .select(HD_SELECT)
      .single<HdDb>();
    if (!error && data) return mapHoaDonDb(data);
    if (error?.code === "23505") {
      lastErr = error.message;
      continue;
    }
    throw new Error(error?.message ?? lastErr);
  }
  throw new Error(lastErr);
}

export async function tuKhaiHoaDon(input: {
  hoaDonId: string;
  actorId: string;
}): Promise<
  | { ok: true; anHanDen: string }
  | {
      ok: false;
      error: string;
      lyDo?: "het_luot_tu_khai" | "khong_con_no";
      status?: 400 | 409;
    }
> {
  const admin = createServiceRoleClient();
  const { data: hd } = await admin
    .from("cins_hoa_don")
    .select(HD_SELECT)
    .eq("id", input.hoaDonId)
    .maybeSingle<HdDb>();
  if (!hd) return { ok: false, error: "Không tìm thấy hoá đơn.", status: 400 };

  const mapped = mapHoaDonDb(hd);
  const gate = coTheTuKhai({
    trangThai: mapped.trangThai,
    tuKhaiLan: mapped.tuKhaiLan,
    tuKhaiDaTraLuc: mapped.tuKhaiDaTraLuc,
  });
  if (!gate.ok) {
    if (gate.lyDo === "het_luot_tu_khai") {
      return {
        ok: false,
        error: "Đã hết lượt tự khai. Gửi khiếu nại để được hỗ trợ.",
        lyDo: "het_luot_tu_khai",
        status: 409,
      };
    }
    return {
      ok: false,
      error: "Hoá đơn không còn nợ.",
      lyDo: "khong_con_no",
      status: 400,
    };
  }

  const now = new Date();
  const nextLan = mapped.tuKhaiLan + 1;
  const { data: updated, error } = await admin
    .from("cins_hoa_don")
    .update({
      tu_khai_da_tra_luc: now.toISOString(),
      tu_khai_lan: nextLan,
      tu_khai_boi: input.actorId,
      cap_nhat_luc: now.toISOString(),
    })
    .eq("id", hd.id)
    .eq("tu_khai_lan", mapped.tuKhaiLan)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) return { ok: false, error: error.message, status: 400 };
  if (!updated) {
    return {
      ok: false,
      error: "Đã hết lượt tự khai. Gửi khiếu nại để được hỗ trợ.",
      lyDo: "het_luot_tu_khai",
      status: 409,
    };
  }

  if (hd.nguon_bang === "org_phi_ky" && hd.nguon_id) {
    const { data: ky } = await admin
      .from("org_phi_ky")
      .select("id_to_chuc")
      .eq("id", hd.nguon_id)
      .maybeSingle<{ id_to_chuc: string }>();
    if (ky?.id_to_chuc) {
      const { tuKhaiDaTraKy } = await import("@/lib/co-so/phi-sepay");
      await tuKhaiDaTraKy({
        orgId: ky.id_to_chuc,
        kyId: hd.nguon_id,
        actorId: input.actorId,
        boQuaGioiHanLan: true,
      });
    }
  }

  if (hd.nguon_bang === "shop_phi_ky" && hd.nguon_id) {
    const { data: ky } = await admin
      .from("shop_phi_ky")
      .select("id_nguoi_ban")
      .eq("id", hd.nguon_id)
      .maybeSingle<{ id_nguoi_ban: string }>();
    if (ky?.id_nguoi_ban) {
      const { applyShopGateFromSignals } = await import("@/lib/shop/gate");
      await applyShopGateFromSignals(ky.id_nguoi_ban);
    }
  }

  const soNgay = await getSoNgayAnHanTuKhai();
  return {
    ok: true,
    anHanDen:
      anHanDenIso(now.toISOString(), soNgay) ??
      new Date(now.getTime() + soNgay * 86_400_000).toISOString(),
  };
}
