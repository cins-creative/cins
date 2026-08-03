/**
 * Công thức giảm combo — thuần, không I/O.
 * Dùng chung server (chốt đơn) và client (xem trước).
 */

export type LoaiGiamCombo = "phan_tram" | "so_tien";

export type ComboGiamInput = {
  loaiGiam: LoaiGiamCombo;
  giaTriGiam: number;
  /** Trần khi loai = phan_tram (nullable). */
  giamToiDaVnd?: number | null;
};

export type GioHangItem = {
  /** Khóa tham chiếu ổn định khi phân bổ (vd. hocVienLopId hoặc index). */
  key: string;
  khoaId: string;
  goiId: string | null;
  giaGocVnd: number;
};

export type ComboThanhPhanMatch = {
  khoaId: string;
  /** null = mọi gói của khóa. */
  goiId: string | null;
};

export type ComboMatchCandidate = {
  id: string;
  ten: string;
  loaiGiam: LoaiGiamCombo;
  giaTriGiam: number;
  giamToiDaVnd?: number | null;
  thanhPhan: ComboThanhPhanMatch[];
  apDungTu?: string | null;
  apDungDen?: string | null;
  dangBan?: boolean;
};

export type TinhGiamComboResult = {
  giaGocVnd: number;
  giamVnd: number;
  tongVnd: number;
};

export type PhanBoGiamItem = {
  key: string;
  giaGocVnd: number;
  giamVnd: number;
  soTienVnd: number;
};

function clampNonNeg(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** Tính số tiền giảm từ tổng gốc. */
export function tinhGiamCombo(
  giaGocVnd: number,
  combo: ComboGiamInput,
): TinhGiamComboResult {
  const goc = clampNonNeg(giaGocVnd);
  let giam = 0;
  if (combo.loaiGiam === "phan_tram") {
    const pct = Math.min(100, Math.max(0, Number(combo.giaTriGiam) || 0));
    giam = Math.floor((goc * pct) / 100);
    const ceil = combo.giamToiDaVnd;
    if (ceil != null && Number.isFinite(ceil) && ceil >= 0) {
      giam = Math.min(giam, Math.floor(ceil));
    }
  } else {
    giam = clampNonNeg(Number(combo.giaTriGiam) || 0);
  }
  giam = Math.min(giam, goc);
  return { giaGocVnd: goc, giamVnd: giam, tongVnd: goc - giam };
}

/**
 * Phân bổ giam_vnd theo tỉ lệ gia_goc; phần dư dồn đơn đầu
 * để Σ so_tien_vnd = tong_vnd tuyệt đối.
 */
export function phanBoGiamCombo(
  items: ReadonlyArray<{ key: string; giaGocVnd: number }>,
  giamVnd: number,
): PhanBoGiamItem[] {
  const rows = items.map((it) => ({
    key: it.key,
    giaGocVnd: clampNonNeg(it.giaGocVnd),
  }));
  const tongGoc = rows.reduce((s, r) => s + r.giaGocVnd, 0);
  const giam = Math.min(clampNonNeg(giamVnd), tongGoc);
  if (rows.length === 0) return [];
  if (tongGoc === 0 || giam === 0) {
    return rows.map((r) => ({
      key: r.key,
      giaGocVnd: r.giaGocVnd,
      giamVnd: 0,
      soTienVnd: r.giaGocVnd,
    }));
  }

  const out: PhanBoGiamItem[] = [];
  let allocated = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    let piece: number;
    if (i === rows.length - 1) {
      piece = giam - allocated;
    } else {
      piece = Math.floor((giam * r.giaGocVnd) / tongGoc);
      allocated += piece;
    }
    piece = Math.min(piece, r.giaGocVnd);
    out.push({
      key: r.key,
      giaGocVnd: r.giaGocVnd,
      giamVnd: piece,
      soTienVnd: r.giaGocVnd - piece,
    });
  }

  // Phần dư (do floor sớm) dồn đơn đầu — điều chỉnh từ đuôi về đầu nếu cần
  const sumGiam = out.reduce((s, r) => s + r.giamVnd, 0);
  let rem = giam - sumGiam;
  if (rem !== 0 && out.length > 0) {
    const first = out[0]!;
    const nextGiam = Math.min(first.giaGocVnd, Math.max(0, first.giamVnd + rem));
    first.giamVnd = nextGiam;
    first.soTienVnd = first.giaGocVnd - nextGiam;
  }

  return out;
}

function todayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function comboConHieuLuc(
  c: Pick<ComboMatchCandidate, "apDungTu" | "apDungDen" | "dangBan">,
  today = todayYmdLocal(),
): boolean {
  if (c.dangBan === false) return false;
  if (c.apDungTu && c.apDungTu > today) return false;
  if (c.apDungDen && c.apDungDen < today) return false;
  return true;
}

/** Một dòng thành phần có khớp item trong giỏ? */
function thanhPhanKhopItem(
  tp: ComboThanhPhanMatch,
  item: Pick<GioHangItem, "khoaId" | "goiId">,
): boolean {
  if (tp.khoaId !== item.khoaId) return false;
  if (tp.goiId == null) return true;
  return tp.goiId === item.goiId;
}

/**
 * Combo khớp khi mọi thành phần đều có item cover,
 * và dùng ≥ 2 khóa khác nhau trong tập cover.
 */
export function comboKhopGioHang(
  combo: ComboMatchCandidate,
  gioHang: ReadonlyArray<Pick<GioHangItem, "khoaId" | "goiId">>,
): boolean {
  if (!comboConHieuLuc(combo)) return false;
  if (combo.thanhPhan.length < 2) return false;

  const usedKeys = new Set<string>();
  const coveredKhoa = new Set<string>();

  for (const tp of combo.thanhPhan) {
    let found = false;
    for (let i = 0; i < gioHang.length; i++) {
      const item = gioHang[i]!;
      const uk = `${item.khoaId}|${item.goiId ?? ""}|${i}`;
      if (usedKeys.has(uk)) continue;
      if (thanhPhanKhopItem(tp, item)) {
        usedKeys.add(uk);
        coveredKhoa.add(item.khoaId);
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return coveredKhoa.size >= 2;
}

/** Chọn combo giảm nhiều nhất (C4). */
export function timComboKhopNhat(
  gioHang: ReadonlyArray<GioHangItem>,
  combos: ReadonlyArray<ComboMatchCandidate>,
): {
  combo: ComboMatchCandidate;
  tinh: TinhGiamComboResult;
  phanBo: PhanBoGiamItem[];
} | null {
  const giaGoc = gioHang.reduce((s, it) => s + clampNonNeg(it.giaGocVnd), 0);
  let best: {
    combo: ComboMatchCandidate;
    tinh: TinhGiamComboResult;
  } | null = null;

  for (const c of combos) {
    if (!comboKhopGioHang(c, gioHang)) continue;
    const tinh = tinhGiamCombo(giaGoc, {
      loaiGiam: c.loaiGiam,
      giaTriGiam: c.giaTriGiam,
      giamToiDaVnd: c.giamToiDaVnd,
    });
    if (!best || tinh.giamVnd > best.tinh.giamVnd) {
      best = { combo: c, tinh };
    }
  }

  if (!best) return null;
  const phanBo = phanBoGiamCombo(
    gioHang.map((it) => ({ key: it.key, giaGocVnd: it.giaGocVnd })),
    best.tinh.giamVnd,
  );
  return { combo: best.combo, tinh: best.tinh, phanBo };
}
