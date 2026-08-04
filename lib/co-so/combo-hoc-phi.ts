import "server-only";

import {
  timComboKhopNhat,
  tinhGiamCombo,
  type ComboMatchCandidate,
  type GioHangItem,
  type LoaiGiamCombo,
} from "@/lib/co-so/combo-hoc-phi-tinh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { ComboMatchCandidate, GioHangItem, LoaiGiamCombo };
export { timComboKhopNhat, tinhGiamCombo };

export type ComboThanhPhan = {
  id: string;
  khoaId: string;
  khoaTen: string | null;
  goiId: string | null;
  goiTen: string | null;
  goiGiaVnd: number | null;
};

export type ComboHocPhi = {
  id: string;
  ten: string;
  moTa: string | null;
  loaiGiam: LoaiGiamCombo;
  giaTriGiam: number;
  giamToiDaVnd: number | null;
  apDungTu: string | null;
  apDungDen: string | null;
  hienTrangKhoa: boolean;
  dangBan: boolean;
  thuTu: number;
  thanhPhan: ComboThanhPhan[];
};

export type ComboThanhPhanInput = {
  khoaId: string;
  goiId?: string | null;
};

export type LuuComboInput = {
  orgId: string;
  comboId?: string | null;
  ten: string;
  moTa?: string | null;
  loaiGiam: LoaiGiamCombo;
  giaTriGiam: number;
  giamToiDaVnd?: number | null;
  apDungTu?: string | null;
  apDungDen?: string | null;
  hienTrangKhoa?: boolean;
  dangBan?: boolean;
  thuTu?: number;
  thanhPhan: ComboThanhPhanInput[];
};

type ComboRow = {
  id: string;
  ten: string;
  mo_ta: string | null;
  loai_giam: string;
  gia_tri_giam: number | string;
  giam_toi_da_vnd: number | string | null;
  ap_dung_tu: string | null;
  ap_dung_den: string | null;
  hien_trang_khoa: boolean;
  dang_ban: boolean;
  thu_tu: number;
};

type TpRow = {
  id: string;
  id_combo: string;
  id_khoa_hoc: string;
  id_goi: string | null;
  org_khoa_hoc?:
    | { ten_khoa_hoc: string | null }
    | { ten_khoa_hoc: string | null }[]
    | null;
  org_goi_hoc_phi?:
    | { ten: string | null; gia_vnd: number | string | null }
    | { ten: string | null; gia_vnd: number | string | null }[]
    | null;
};

function mapLoai(raw: string): LoaiGiamCombo {
  return raw === "so_tien" ? "so_tien" : "phan_tram";
}

function validateLuu(input: LuuComboInput): string | null {
  const ten = input.ten.trim();
  if (!ten) return "Tên combo không được trống.";
  if (input.loaiGiam !== "phan_tram" && input.loaiGiam !== "so_tien") {
    return "loai_giam không hợp lệ.";
  }
  const gtg = Number(input.giaTriGiam);
  if (!Number.isFinite(gtg) || gtg < 0) return "gia_tri_giam phải ≥ 0.";
  if (input.loaiGiam === "phan_tram" && (gtg <= 0 || gtg > 100)) {
    return "Phần trăm giảm phải trong (0, 100].";
  }
  if (!Array.isArray(input.thanhPhan) || input.thanhPhan.length < 2) {
    return "Combo cần ≥ 2 thành phần.";
  }
  const khoaSet = new Set(
    input.thanhPhan.map((t) => t.khoaId?.trim()).filter(Boolean),
  );
  if (khoaSet.size < 2) return "Combo cần ≥ 2 khóa khác nhau.";
  return null;
}

async function loadThanhPhan(
  admin: ReturnType<typeof createServiceRoleClient>,
  comboIds: string[],
): Promise<Map<string, ComboThanhPhan[]>> {
  const map = new Map<string, ComboThanhPhan[]>();
  for (const id of comboIds) map.set(id, []);
  if (comboIds.length === 0) return map;

  const { data, error } = await admin
    .from("org_combo_thanh_phan")
    .select(
      "id, id_combo, id_khoa_hoc, id_goi, org_khoa_hoc(ten_khoa_hoc), org_goi_hoc_phi(ten, gia_vnd)",
    )
    .in("id_combo", comboIds);

  if (error || !data) return map;

  for (const raw of data) {
    const row = raw as unknown as TpRow;
    const khoaEmbed = row.org_khoa_hoc;
    const goiEmbed = row.org_goi_hoc_phi;
    const bag = map.get(row.id_combo) ?? [];
    bag.push({
      id: row.id,
      khoaId: row.id_khoa_hoc,
      khoaTen:
        (Array.isArray(khoaEmbed)
          ? khoaEmbed[0]?.ten_khoa_hoc
          : khoaEmbed?.ten_khoa_hoc
        )?.trim() || null,
      goiId: row.id_goi,
      goiTen:
        (Array.isArray(goiEmbed) ? goiEmbed[0]?.ten : goiEmbed?.ten)?.trim() ||
        null,
      goiGiaVnd: (() => {
        const g = Array.isArray(goiEmbed) ? goiEmbed[0]?.gia_vnd : goiEmbed?.gia_vnd;
        return g == null ? null : Number(g) || 0;
      })(),
    });
    map.set(row.id_combo, bag);
  }
  return map;
}

function mapCombo(row: ComboRow, tp: ComboThanhPhan[]): ComboHocPhi {
  return {
    id: row.id,
    ten: row.ten,
    moTa: row.mo_ta,
    loaiGiam: mapLoai(row.loai_giam),
    giaTriGiam: Number(row.gia_tri_giam) || 0,
    giamToiDaVnd:
      row.giam_toi_da_vnd == null ? null : Number(row.giam_toi_da_vnd) || 0,
    apDungTu: row.ap_dung_tu,
    apDungDen: row.ap_dung_den,
    hienTrangKhoa: Boolean(row.hien_trang_khoa),
    dangBan: Boolean(row.dang_ban),
    thuTu: Number(row.thu_tu) || 0,
    thanhPhan: tp,
  };
}

export async function listCombo(
  orgId: string,
  opts?: { includeHidden?: boolean },
): Promise<ComboHocPhi[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("org_combo_hoc_phi")
    .select(
      "id, ten, mo_ta, loai_giam, gia_tri_giam, giam_toi_da_vnd, ap_dung_tu, ap_dung_den, hien_trang_khoa, dang_ban, thu_tu",
    )
    .eq("id_to_chuc", orgId)
    .eq("da_xoa", false)
    .order("thu_tu", { ascending: true })
    .order("tao_luc", { ascending: false });

  if (!opts?.includeHidden) {
    q = q.eq("dang_ban", true);
  }

  const { data, error } = await q;
  if (error || !data) return [];

  const rows = data as ComboRow[];
  const tpMap = await loadThanhPhan(
    admin,
    rows.map((r) => r.id),
  );
  return rows.map((r) => mapCombo(r, tpMap.get(r.id) ?? []));
}

export async function getComboById(
  orgId: string,
  comboId: string,
): Promise<ComboHocPhi | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_combo_hoc_phi")
    .select(
      "id, ten, mo_ta, loai_giam, gia_tri_giam, giam_toi_da_vnd, ap_dung_tu, ap_dung_den, hien_trang_khoa, dang_ban, thu_tu",
    )
    .eq("id", comboId)
    .eq("id_to_chuc", orgId)
    .eq("da_xoa", false)
    .maybeSingle();
  if (!data) return null;
  const tpMap = await loadThanhPhan(admin, [comboId]);
  return mapCombo(data as ComboRow, tpMap.get(comboId) ?? []);
}

export async function luuCombo(
  input: LuuComboInput,
): Promise<{ ok: true; combo: ComboHocPhi } | { ok: false; error: string }> {
  const err = validateLuu(input);
  if (err) return { ok: false, error: err };

  const admin = createServiceRoleClient();
  const payloadCombo = {
    id: input.comboId ?? null,
    ten: input.ten.trim(),
    mo_ta: input.moTa?.trim() || null,
    loai_giam: input.loaiGiam,
    gia_tri_giam: Number(input.giaTriGiam),
    giam_toi_da_vnd:
      input.giamToiDaVnd == null || input.giamToiDaVnd === undefined
        ? null
        : Number(input.giamToiDaVnd),
    ap_dung_tu: input.apDungTu?.trim() || null,
    ap_dung_den: input.apDungDen?.trim() || null,
    hien_trang_khoa: input.hienTrangKhoa !== false,
    dang_ban: input.dangBan !== false,
    thu_tu: input.thuTu ?? 0,
  };
  const payloadTp = input.thanhPhan.map((t) => ({
    id_khoa_hoc: t.khoaId,
    id_goi: t.goiId?.trim() || null,
  }));

  const { data: comboId, error } = await admin.rpc("cins_luu_combo_hoc_phi", {
    p_org: input.orgId,
    p_combo: payloadCombo,
    p_thanh_phan: payloadTp,
  });

  if (error || !comboId) {
    return {
      ok: false,
      error: error?.message ?? "Không lưu được combo.",
    };
  }

  const combo = await getComboById(input.orgId, String(comboId));
  if (!combo) return { ok: false, error: "Lưu xong nhưng không đọc lại được." };
  return { ok: true, combo };
}

export async function softDeleteCombo(
  orgId: string,
  comboId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_combo_hoc_phi")
    .update({ da_xoa: true, dang_ban: false, cap_nhat_luc: new Date().toISOString() })
    .eq("id", comboId)
    .eq("id_to_chuc", orgId)
    .eq("da_xoa", false)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Không tìm thấy combo." };
  return { ok: true };
}

export async function patchComboFlags(
  orgId: string,
  comboId: string,
  patch: { dangBan?: boolean; hienTrangKhoa?: boolean },
): Promise<{ ok: true; combo: ComboHocPhi } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const body: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (patch.dangBan !== undefined) body.dang_ban = patch.dangBan;
  if (patch.hienTrangKhoa !== undefined) body.hien_trang_khoa = patch.hienTrangKhoa;

  const { data, error } = await admin
    .from("org_combo_hoc_phi")
    .update(body)
    .eq("id", comboId)
    .eq("id_to_chuc", orgId)
    .eq("da_xoa", false)
    .select(
      "id, ten, mo_ta, loai_giam, gia_tri_giam, giam_toi_da_vnd, ap_dung_tu, ap_dung_den, hien_trang_khoa, dang_ban, thu_tu",
    )
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không cập nhật được." };
  }
  const tpMap = await loadThanhPhan(admin, [comboId]);
  return { ok: true, combo: mapCombo(data as ComboRow, tpMap.get(comboId) ?? []) };
}

export function toMatchCandidates(combos: ComboHocPhi[]): ComboMatchCandidate[] {
  return combos.map((c) => ({
    id: c.id,
    ten: c.ten,
    loaiGiam: c.loaiGiam,
    giaTriGiam: c.giaTriGiam,
    giamToiDaVnd: c.giamToiDaVnd,
    apDungTu: c.apDungTu,
    apDungDen: c.apDungDen,
    dangBan: c.dangBan,
    thanhPhan: c.thanhPhan.map((t) => ({
      khoaId: t.khoaId,
      goiId: t.goiId,
    })),
  }));
}

export type BaoGiaItem = { khoaId: string; goiId: string };

export type BaoGiaResult = {
  giaGocVnd: number;
  giamVnd: number;
  tongVnd: number;
  combo: { id: string; ten: string; loaiGiam: LoaiGiamCombo; giaTriGiam: number } | null;
  lines: Array<{
    khoaId: string;
    goiId: string;
    giaGocVnd: number;
    giamVnd: number;
    soTienVnd: number;
    soNgay: number;
    tenGoi: string | null;
    tenKhoa: string | null;
  }>;
};

/** Báo giá giỏ [{ khoaId, goiId }] — giá từ DB. */
export async function baoGiaGioHang(
  orgId: string,
  items: BaoGiaItem[],
): Promise<{ ok: true; baoGia: BaoGiaResult } | { ok: false; error: string }> {
  if (!items.length) return { ok: false, error: "Giỏ trống." };

  const admin = createServiceRoleClient();
  const goiIds = [...new Set(items.map((i) => i.goiId).filter(Boolean))];
  const { data: goiRows, error } = await admin
    .from("org_goi_hoc_phi")
    .select("id, ten, gia_vnd, so_ngay, id_to_chuc, id_khoa_hoc, dang_ban")
    .in("id", goiIds)
    .eq("id_to_chuc", orgId);

  if (error) return { ok: false, error: error.message };
  const goiMap = new Map(
    (goiRows ?? []).map((g) => [
      g.id as string,
      {
        ten: (g.ten as string) ?? null,
        gia: Number(g.gia_vnd) || 0,
        soNgay: Number(g.so_ngay) || 0,
        khoaId: (g.id_khoa_hoc as string | null) ?? null,
        dangBan: Boolean(g.dang_ban),
      },
    ]),
  );

  const khoaIds = [...new Set(items.map((i) => i.khoaId))];
  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id, ten_khoa_hoc, id_to_chuc")
    .in("id", khoaIds)
    .eq("id_to_chuc", orgId);
  const khoaMap = new Map(
    (khoaRows ?? []).map((k) => [
      k.id as string,
      (k.ten_khoa_hoc as string | null)?.trim() || null,
    ]),
  );

  const linesBase: BaoGiaResult["lines"] = [];
  const gio: GioHangItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    if (!khoaMap.has(it.khoaId)) {
      return { ok: false, error: `Khóa không thuộc cơ sở: ${it.khoaId}` };
    }
    const goi = goiMap.get(it.goiId);
    if (!goi) return { ok: false, error: `Không tìm thấy gói: ${it.goiId}` };
    if (!goi.dangBan) {
      return { ok: false, error: `Gói đã ẩn: ${goi.ten ?? it.goiId}` };
    }
    const key = `${it.khoaId}:${it.goiId}:${i}`;
    gio.push({
      key,
      khoaId: it.khoaId,
      goiId: it.goiId,
      giaGocVnd: goi.gia,
    });
    linesBase.push({
      khoaId: it.khoaId,
      goiId: it.goiId,
      giaGocVnd: goi.gia,
      giamVnd: 0,
      soTienVnd: goi.gia,
      soNgay: goi.soNgay,
      tenGoi: goi.ten,
      tenKhoa: khoaMap.get(it.khoaId) ?? null,
    });
  }

  const combos = await listCombo(orgId, { includeHidden: false });
  const match = timComboKhopNhat(gio, toMatchCandidates(combos));
  const giaGocVnd = linesBase.reduce((s, l) => s + l.giaGocVnd, 0);

  if (!match) {
    return {
      ok: true,
      baoGia: {
        giaGocVnd,
        giamVnd: 0,
        tongVnd: giaGocVnd,
        combo: null,
        lines: linesBase,
      },
    };
  }

  const byKey = new Map(match.phanBo.map((p) => [p.key, p]));
  const lines = linesBase.map((l, i) => {
    const key = `${l.khoaId}:${l.goiId}:${i}`;
    const p = byKey.get(key);
    return {
      ...l,
      giamVnd: p?.giamVnd ?? 0,
      soTienVnd: p?.soTienVnd ?? l.giaGocVnd,
    };
  });

  return {
    ok: true,
    baoGia: {
      giaGocVnd: match.tinh.giaGocVnd,
      giamVnd: match.tinh.giamVnd,
      tongVnd: match.tinh.tongVnd,
      combo: {
        id: match.combo.id,
        ten: match.combo.ten,
        loaiGiam: match.combo.loaiGiam,
        giaTriGiam: match.combo.giaTriGiam,
      },
      lines,
    },
  };
}
