import "server-only";

import { assertBanHangEnabled } from "@/lib/shop/settings";
import type {
  ShopCombo,
  ShopComboDieuKien,
  ShopComboPhamVi,
  ShopLoaiGiam,
} from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const COMBO_SELECT =
  "id, id_nguoi_dung, ten, mo_ta, loai_giam, gia_tri, giam_toi_da, ap_dung_lap, bat_dau, ket_thuc, kich_hoat, thu_tu, tao_luc";

const DK_SELECT =
  "id, id_combo, pham_vi, id_nhom, id_san_pham, id_bien_the, so_luong";

type ComboRow = {
  id: string;
  id_nguoi_dung: string;
  ten: string;
  mo_ta: string | null;
  loai_giam: ShopLoaiGiam;
  gia_tri: number | string;
  giam_toi_da: number | string | null;
  ap_dung_lap: boolean;
  bat_dau: string | null;
  ket_thuc: string | null;
  kich_hoat: boolean;
  thu_tu: number;
  tao_luc: string;
};

type DkRow = {
  id: string;
  id_combo: string;
  pham_vi: ShopComboPhamVi;
  id_nhom: string | null;
  id_san_pham: string | null;
  id_bien_the: string | null;
  so_luong: number;
};

function num(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapDk(r: DkRow, nhan?: string | null): ShopComboDieuKien {
  return {
    id: r.id,
    idCombo: r.id_combo,
    phamVi: r.pham_vi,
    idNhom: r.id_nhom,
    idSanPham: r.id_san_pham,
    idBienThe: r.id_bien_the,
    soLuong: r.so_luong,
    nhan: nhan ?? null,
  };
}

function mapCombo(
  r: ComboRow,
  dieuKien: ShopComboDieuKien[],
  dieuKienLoi = false,
): ShopCombo {
  return {
    id: r.id,
    idNguoiDung: r.id_nguoi_dung,
    ten: r.ten,
    moTa: r.mo_ta,
    loaiGiam: r.loai_giam,
    giaTri: num(r.gia_tri) ?? 0,
    giamToiDa: num(r.giam_toi_da),
    apDungLap: r.ap_dung_lap === true,
    batDau: r.bat_dau,
    ketThuc: r.ket_thuc,
    kichHoat: r.kich_hoat === true,
    thuTu: r.thu_tu,
    taoLuc: r.tao_luc,
    dieuKien,
    dieuKienLoi,
  };
}

export type ComboDieuKienInput = {
  phamVi: ShopComboPhamVi;
  idNhom?: string | null;
  idSanPham?: string | null;
  idBienThe?: string | null;
  soLuong: number;
};

export type ComboCreateInput = {
  ten: string;
  moTa?: string | null;
  loaiGiam: ShopLoaiGiam;
  giaTri: number;
  giamToiDa?: number | null;
  apDungLap?: boolean;
  batDau?: string | null;
  ketThuc?: string | null;
  kichHoat?: boolean;
  thuTu?: number;
  dieuKien: ComboDieuKienInput[];
};

function normalizeTen(raw: string): string {
  const t = raw.trim();
  if (!t || t.length > 80) throw new Error("COMBO_TEN_INVALID");
  return t;
}

function normalizeMoTa(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.length > 280) throw new Error("COMBO_MO_TA_INVALID");
  return t;
}

function validateGiam(
  loaiGiam: ShopLoaiGiam,
  giaTri: number,
  giamToiDa: number | null | undefined,
): { giaTri: number; giamToiDa: number | null } {
  if (!Number.isFinite(giaTri) || giaTri <= 0) {
    throw new Error("COMBO_GIA_TRI_INVALID");
  }
  if (loaiGiam === "phan_tram") {
    if (giaTri > 100) throw new Error("COMBO_GIA_TRI_INVALID");
  }
  let toiDa: number | null = null;
  if (giamToiDa != null && giamToiDa !== undefined) {
    if (!Number.isFinite(giamToiDa) || giamToiDa <= 0) {
      throw new Error("COMBO_GIAM_TOI_DA_INVALID");
    }
    toiDa = giamToiDa;
  }
  return { giaTri, giamToiDa: toiDa };
}

function validateThoiGian(
  batDau: string | null | undefined,
  ketThuc: string | null | undefined,
): { batDau: string | null; ketThuc: string | null } {
  const bd = batDau?.trim() || null;
  const kt = ketThuc?.trim() || null;
  if (bd && Number.isNaN(Date.parse(bd))) throw new Error("COMBO_THOI_GIAN_INVALID");
  if (kt && Number.isNaN(Date.parse(kt))) throw new Error("COMBO_THOI_GIAN_INVALID");
  if (bd && kt && Date.parse(kt) <= Date.parse(bd)) {
    throw new Error("COMBO_THOI_GIAN_INVALID");
  }
  return { batDau: bd, ketThuc: kt };
}

async function assertDieuKienBelongToOwner(
  ownerId: string,
  dieuKien: ComboDieuKienInput[],
): Promise<Array<{
  pham_vi: ShopComboPhamVi;
  id_nhom: string | null;
  id_san_pham: string | null;
  id_bien_the: string | null;
  so_luong: number;
}>> {
  if (!dieuKien.length) throw new Error("COMBO_DIEU_KIEN_REQUIRED");
  const admin = createServiceRoleClient();
  const rows: Array<{
    pham_vi: ShopComboPhamVi;
    id_nhom: string | null;
    id_san_pham: string | null;
    id_bien_the: string | null;
    so_luong: number;
  }> = [];

  for (const dk of dieuKien) {
    const soLuong = Math.trunc(dk.soLuong);
    if (!Number.isFinite(soLuong) || soLuong <= 0) {
      throw new Error("COMBO_DIEU_KIEN_INVALID");
    }
    if (dk.phamVi === "loai_hang") {
      const id = dk.idNhom?.trim();
      if (!id) throw new Error("COMBO_DIEU_KIEN_INVALID");
      const { data } = await admin
        .from("shop_nhom")
        .select("id")
        .eq("id", id)
        .eq("id_nguoi_dung", ownerId)
        .eq("truc", 1)
        .eq("da_xoa", false)
        .maybeSingle();
      if (!data) throw new Error("COMBO_DIEU_KIEN_INVALID");
      rows.push({
        pham_vi: "loai_hang",
        id_nhom: id,
        id_san_pham: null,
        id_bien_the: null,
        so_luong: soLuong,
      });
    } else if (dk.phamVi === "san_pham") {
      const id = dk.idSanPham?.trim();
      if (!id) throw new Error("COMBO_DIEU_KIEN_INVALID");
      const { data } = await admin
        .from("shop_san_pham")
        .select("id")
        .eq("id", id)
        .eq("id_nguoi_dung", ownerId)
        .eq("da_xoa", false)
        .maybeSingle();
      if (!data) throw new Error("COMBO_DIEU_KIEN_INVALID");
      rows.push({
        pham_vi: "san_pham",
        id_nhom: null,
        id_san_pham: id,
        id_bien_the: null,
        so_luong: soLuong,
      });
    } else if (dk.phamVi === "bien_the") {
      const id = dk.idBienThe?.trim();
      if (!id) throw new Error("COMBO_DIEU_KIEN_INVALID");
      const { data: bt } = await admin
        .from("shop_bien_the")
        .select("id, id_san_pham, da_xoa")
        .eq("id", id)
        .eq("da_xoa", false)
        .maybeSingle<{ id: string; id_san_pham: string; da_xoa: boolean }>();
      if (!bt) throw new Error("COMBO_DIEU_KIEN_INVALID");
      const { data: sp } = await admin
        .from("shop_san_pham")
        .select("id")
        .eq("id", bt.id_san_pham)
        .eq("id_nguoi_dung", ownerId)
        .eq("da_xoa", false)
        .maybeSingle();
      if (!sp) throw new Error("COMBO_DIEU_KIEN_INVALID");
      rows.push({
        pham_vi: "bien_the",
        id_nhom: null,
        id_san_pham: null,
        id_bien_the: id,
        so_luong: soLuong,
      });
    } else {
      throw new Error("COMBO_DIEU_KIEN_INVALID");
    }
  }

  /* Không trùng cùng target trong 1 combo. */
  const keys = new Set<string>();
  for (const r of rows) {
    const k = `${r.pham_vi}:${r.id_nhom ?? r.id_san_pham ?? r.id_bien_the}`;
    if (keys.has(k)) throw new Error("COMBO_DIEU_KIEN_DUPLICATE");
    keys.add(k);
  }
  return rows;
}

async function loadDieuKien(
  comboIds: string[],
): Promise<Map<string, { dieuKien: ShopComboDieuKien[]; loi: boolean }>> {
  const out = new Map<string, { dieuKien: ShopComboDieuKien[]; loi: boolean }>();
  if (comboIds.length === 0) return out;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_combo_dieu_kien")
    .select(DK_SELECT)
    .in("id_combo", comboIds);
  const rows = (data ?? []) as DkRow[];

  const nhomIds = [
    ...new Set(rows.map((r) => r.id_nhom).filter((x): x is string => !!x)),
  ];
  const spIds = [
    ...new Set(rows.map((r) => r.id_san_pham).filter((x): x is string => !!x)),
  ];
  const btIds = [
    ...new Set(rows.map((r) => r.id_bien_the).filter((x): x is string => !!x)),
  ];

  const nhanByNhom = new Map<string, string>();
  const nhomAlive = new Set<string>();
  if (nhomIds.length) {
    const { data: nhoms } = await admin
      .from("shop_nhom")
      .select("id, nhan, da_xoa")
      .in("id", nhomIds);
    for (const n of (nhoms ?? []) as Array<{
      id: string;
      nhan: string;
      da_xoa: boolean;
    }>) {
      nhanByNhom.set(n.id, n.nhan);
      if (!n.da_xoa) nhomAlive.add(n.id);
    }
  }

  const nhanBySp = new Map<string, string>();
  const spAlive = new Set<string>();
  if (spIds.length) {
    const { data: sps } = await admin
      .from("shop_san_pham")
      .select("id, ten, da_xoa")
      .in("id", spIds);
    for (const s of (sps ?? []) as Array<{
      id: string;
      ten: string;
      da_xoa: boolean;
    }>) {
      nhanBySp.set(s.id, s.ten);
      if (!s.da_xoa) spAlive.add(s.id);
    }
  }

  const nhanByBt = new Map<string, string>();
  const btAlive = new Set<string>();
  if (btIds.length) {
    const { data: bts } = await admin
      .from("shop_bien_the")
      .select("id, nhan, da_xoa, id_san_pham")
      .in("id", btIds);
    for (const b of (bts ?? []) as Array<{
      id: string;
      nhan: string;
      da_xoa: boolean;
      id_san_pham: string;
    }>) {
      nhanByBt.set(b.id, b.nhan);
      if (!b.da_xoa) btAlive.add(b.id);
    }
  }

  for (const id of comboIds) out.set(id, { dieuKien: [], loi: false });
  for (const r of rows) {
    const entry = out.get(r.id_combo);
    if (!entry) continue;
    let nhan: string | null = null;
    let loi = false;
    if (r.pham_vi === "loai_hang") {
      nhan = r.id_nhom ? nhanByNhom.get(r.id_nhom) ?? null : null;
      if (!r.id_nhom || !nhomAlive.has(r.id_nhom)) loi = true;
    } else if (r.pham_vi === "san_pham") {
      nhan = r.id_san_pham ? nhanBySp.get(r.id_san_pham) ?? null : null;
      if (!r.id_san_pham || !spAlive.has(r.id_san_pham)) loi = true;
    } else {
      nhan = r.id_bien_the ? nhanByBt.get(r.id_bien_the) ?? null : null;
      if (!r.id_bien_the || !btAlive.has(r.id_bien_the)) loi = true;
    }
    if (loi) entry.loi = true;
    entry.dieuKien.push(mapDk(r, nhan));
  }
  return out;
}

export async function listCombo(ownerId: string): Promise<ShopCombo[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_combo")
    .select(COMBO_SELECT)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .order("thu_tu", { ascending: true })
    .order("tao_luc", { ascending: false });
  if (error) throw new Error("COMBO_LIST_FAILED");
  const rows = (data ?? []) as ComboRow[];
  const dkMap = await loadDieuKien(rows.map((r) => r.id));
  return rows.map((r) => {
    const dk = dkMap.get(r.id) ?? { dieuKien: [], loi: false };
    return mapCombo(r, dk.dieuKien, dk.loi);
  });
}

/** Combo đang chạy của seller — dùng engine giỏ. */
export async function listComboKichHoat(
  ownerId: string,
): Promise<ShopCombo[]> {
  const all = await listCombo(ownerId);
  const now = Date.now();
  return all.filter((c) => {
    if (!c.kichHoat || c.dieuKienLoi) return false;
    if (c.batDau && Date.parse(c.batDau) > now) return false;
    if (c.ketThuc && Date.parse(c.ketThuc) <= now) return false;
    return c.dieuKien.length > 0;
  });
}

export async function getCombo(
  ownerId: string,
  id: string,
): Promise<ShopCombo | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_combo")
    .select(COMBO_SELECT)
    .eq("id", id)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .maybeSingle<ComboRow>();
  if (!data) return null;
  const dkMap = await loadDieuKien([data.id]);
  const dk = dkMap.get(data.id) ?? { dieuKien: [], loi: false };
  return mapCombo(data, dk.dieuKien, dk.loi);
}

export async function createCombo(
  ownerId: string,
  input: ComboCreateInput,
): Promise<ShopCombo> {
  await assertBanHangEnabled(ownerId);
  const ten = normalizeTen(input.ten);
  const moTa = normalizeMoTa(input.moTa);
  const { giaTri, giamToiDa } = validateGiam(
    input.loaiGiam,
    input.giaTri,
    input.giamToiDa,
  );
  const { batDau, ketThuc } = validateThoiGian(input.batDau, input.ketThuc);
  const dkRows = await assertDieuKienBelongToOwner(ownerId, input.dieuKien);

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_combo")
    .insert({
      id_nguoi_dung: ownerId,
      ten,
      mo_ta: moTa,
      loai_giam: input.loaiGiam,
      gia_tri: giaTri,
      giam_toi_da: giamToiDa,
      ap_dung_lap: input.apDungLap === true,
      bat_dau: batDau,
      ket_thuc: ketThuc,
      kich_hoat: input.kichHoat !== false,
      thu_tu: input.thuTu ?? 0,
    })
    .select(COMBO_SELECT)
    .single<ComboRow>();
  if (error || !data) {
    console.error("[shop] createCombo", error);
    throw new Error("COMBO_CREATE_FAILED");
  }

  const { error: dkErr } = await admin.from("shop_combo_dieu_kien").insert(
    dkRows.map((r) => ({ ...r, id_combo: data.id })),
  );
  if (dkErr) {
    console.error("[shop] createComboDk", dkErr);
    await admin.from("shop_combo").delete().eq("id", data.id);
    throw new Error("COMBO_CREATE_FAILED");
  }

  const fresh = await getCombo(ownerId, data.id);
  if (!fresh) throw new Error("COMBO_CREATE_FAILED");
  return fresh;
}

export async function updateCombo(
  ownerId: string,
  id: string,
  patch: Partial<ComboCreateInput> & { kichHoat?: boolean },
): Promise<ShopCombo> {
  await assertBanHangEnabled(ownerId);
  const existing = await getCombo(ownerId, id);
  if (!existing) throw new Error("COMBO_NOT_FOUND");

  const admin = createServiceRoleClient();
  const update: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };

  if (patch.ten !== undefined) update.ten = normalizeTen(patch.ten);
  if (patch.moTa !== undefined) update.mo_ta = normalizeMoTa(patch.moTa);
  if (patch.loaiGiam !== undefined || patch.giaTri !== undefined) {
    const loai = patch.loaiGiam ?? existing.loaiGiam;
    const gt = patch.giaTri ?? existing.giaTri;
    const { giaTri, giamToiDa } = validateGiam(
      loai,
      gt,
      patch.giamToiDa !== undefined ? patch.giamToiDa : existing.giamToiDa,
    );
    update.loai_giam = loai;
    update.gia_tri = giaTri;
    update.giam_toi_da = giamToiDa;
  } else if (patch.giamToiDa !== undefined) {
    update.giam_toi_da =
      patch.giamToiDa == null
        ? null
        : validateGiam(existing.loaiGiam, existing.giaTri, patch.giamToiDa)
            .giamToiDa;
  }
  if (patch.apDungLap !== undefined) update.ap_dung_lap = patch.apDungLap === true;
  if (patch.kichHoat !== undefined) update.kich_hoat = patch.kichHoat === true;
  if (patch.thuTu !== undefined) update.thu_tu = patch.thuTu;
  if (patch.batDau !== undefined || patch.ketThuc !== undefined) {
    const { batDau, ketThuc } = validateThoiGian(
      patch.batDau !== undefined ? patch.batDau : existing.batDau,
      patch.ketThuc !== undefined ? patch.ketThuc : existing.ketThuc,
    );
    update.bat_dau = batDau;
    update.ket_thuc = ketThuc;
  }

  const { error } = await admin
    .from("shop_combo")
    .update(update)
    .eq("id", id)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false);
  if (error) throw new Error("COMBO_UPDATE_FAILED");

  if (patch.dieuKien) {
    const dkRows = await assertDieuKienBelongToOwner(ownerId, patch.dieuKien);
    await admin.from("shop_combo_dieu_kien").delete().eq("id_combo", id);
    const { error: dkErr } = await admin.from("shop_combo_dieu_kien").insert(
      dkRows.map((r) => ({ ...r, id_combo: id })),
    );
    if (dkErr) throw new Error("COMBO_UPDATE_FAILED");
  }

  const fresh = await getCombo(ownerId, id);
  if (!fresh) throw new Error("COMBO_NOT_FOUND");
  return fresh;
}

export async function softDeleteCombo(
  ownerId: string,
  id: string,
): Promise<void> {
  await assertBanHangEnabled(ownerId);
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_combo")
    .update({
      da_xoa: true,
      kich_hoat: false,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .select("id");
  if (error) throw new Error("COMBO_DELETE_FAILED");
  if (!data?.length) throw new Error("COMBO_NOT_FOUND");
}
