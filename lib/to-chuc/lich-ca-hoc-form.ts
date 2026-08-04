/** Nhãn mặc định khi khóa liên tục chưa nhập lịch ca — không coi là ca học cụ thể. */
export const DEFAULT_LICH_KHAI_GIANG_LABEL = "Khai giảng hàng tuần";

export const LICH_CA_PRESETS = [
  { id: "sang", label: "Ca sáng" },
  { id: "chieu", label: "Ca chiều" },
  { id: "toi", label: "Ca tối" },
  { id: "cuoi_tuan", label: "Ca cuối tuần" },
] as const;

/** Thứ trong tuần: 2 = T2 … 7 = T7, 0 = CN */
export const THU_OPTIONS = [
  { value: 2, label: "T2" },
  { value: 3, label: "T3" },
  { value: 4, label: "T4" },
  { value: 5, label: "T5" },
  { value: 6, label: "T6" },
  { value: 7, label: "T7" },
  { value: 0, label: "CN" },
] as const;

export type LichCaHocDraft = {
  caLabel: string;
  thu: number[];
  gioBatDau: string;
  gioKetThuc: string;
};

export function emptyLichCaHocDraft(): LichCaHocDraft {
  return { caLabel: "", thu: [], gioBatDau: "", gioKetThuc: "" };
}

export function isDefaultLichHoc(value: string | null | undefined): boolean {
  const t = value?.trim();
  if (!t) return true;
  return t === DEFAULT_LICH_KHAI_GIANG_LABEL;
}

function normalizeTime(raw: string): string {
  const t = raw.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return t;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** Đang gõ giờ 24h → chỉ giữ số + chèn `:` (vd `0830` → `08:30`). */
export function formatTime24hTyping(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Commit giờ 24h → `HH:mm` hợp lệ, hoặc `""` nếu rỗng / không hợp lệ. */
export function commitTime24h(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const digits = t.replace(/\D/g, "");
  if (digits.length < 1 || digits.length > 4) return "";
  let h: number;
  let min: number;
  if (digits.length <= 2) {
    h = Number(digits);
    min = 0;
  } else if (digits.length === 3) {
    h = Number(digits.slice(0, 1));
    min = Number(digits.slice(1));
  } else {
    h = Number(digits.slice(0, 2));
    min = Number(digits.slice(2));
  }
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) {
    return "";
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseThuToken(token: string): number[] {
  const t = token.trim().toUpperCase();
  if (!t) return [];
  const single = /^T(\d)$/.exec(t);
  if (single) {
    const n = Number(single[1]);
    if (n >= 2 && n <= 7) return [n];
    return [];
  }
  if (t === "CN") return [0];
  const range = /^T(\d)-(\d)$/.exec(t);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (a >= 2 && b <= 7 && a <= b) {
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    }
  }
  return [];
}

export function parseThuGroup(raw: string): number[] {
  const cleaned = raw.trim();
  if (!cleaned) return [];
  const parts = cleaned.split(/[,&/]+|\s+/).map((p) => p.trim()).filter(Boolean);
  const out: number[] = [];
  for (const part of parts) {
    for (const n of parseThuToken(part)) {
      if (!out.includes(n)) out.push(n);
    }
  }
  return sortThu(out);
}

function sortThu(thu: number[]): number[] {
  return [...thu].sort((a, b) => {
    const order = (n: number) => (n === 0 ? 8 : n);
    return order(a) - order(b);
  });
}

/** Gom thứ liên tiếp: [2,4,6] → T2-4-6; [2,5] → T2 & T5 */
export function formatThuGroup(thu: number[]): string {
  const sorted = sortThu(thu.filter((n) => n >= 0 && n <= 7));
  if (!sorted.length) return "";

  const label = (n: number) => (n === 0 ? "CN" : `T${n}`);
  const groups: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    const consecutive =
      cur != null &&
      ((prev === 0 && cur === 2) || (prev !== 0 && cur === prev + 1));
    if (consecutive) {
      prev = cur;
      continue;
    }
    groups.push(start === prev ? label(start) : `${label(start)}-${label(prev)}`);
    if (cur != null) {
      start = cur;
      prev = cur;
    }
  }

  return groups.join(" & ");
}

const CA_DAYS_PATTERN = /^(.+?)\s·\s(.+)$/u;
const TIME_ONLY_PATTERN = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/u;
const TIME_START_PARTIAL_PATTERN = /^(\d{1,2}:\d{2})–$/u;
const TIME_END_PARTIAL_PATTERN = /^–(\d{1,2}:\d{2})$/u;
const CA_PREFIX_TIME_FULL_PATTERN =
  /^(.+?)\s[—–-]\s*(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/u;
const CA_PREFIX_TIME_START_PATTERN =
  /^(.+?)\s[—–-]\s*(\d{1,2}:\d{2})–$/u;
const CA_PREFIX_TIME_END_PATTERN =
  /^(.+?)\s[—–-]\s*–(\d{1,2}:\d{2})$/u;

function splitCaDays(combined: string): { caLabel: string; thu: number[] } {
  const dot = combined.indexOf(" · ");
  if (dot === -1) {
    return { caLabel: combined.trim(), thu: [] };
  }
  return {
    caLabel: combined.slice(0, dot).trim(),
    thu: parseThuGroup(combined.slice(dot + 3)),
  };
}

export function parseLichCaHoc(raw: string | null | undefined): LichCaHocDraft {
  const trimmed = raw?.trim();
  if (!trimmed || isDefaultLichHoc(trimmed)) return emptyLichCaHocDraft();

  const caPrefixFull = CA_PREFIX_TIME_FULL_PATTERN.exec(trimmed);
  if (caPrefixFull) {
    const { caLabel, thu } = splitCaDays(caPrefixFull[1]);
    return {
      caLabel,
      thu,
      gioBatDau: normalizeTime(caPrefixFull[2]),
      gioKetThuc: normalizeTime(caPrefixFull[3]),
    };
  }

  const caPrefixStart = CA_PREFIX_TIME_START_PATTERN.exec(trimmed);
  if (caPrefixStart) {
    const { caLabel, thu } = splitCaDays(caPrefixStart[1]);
    return {
      caLabel,
      thu,
      gioBatDau: normalizeTime(caPrefixStart[2]),
      gioKetThuc: "",
    };
  }

  const caPrefixEnd = CA_PREFIX_TIME_END_PATTERN.exec(trimmed);
  if (caPrefixEnd) {
    const { caLabel, thu } = splitCaDays(caPrefixEnd[1]);
    return {
      caLabel,
      thu,
      gioBatDau: "",
      gioKetThuc: normalizeTime(caPrefixEnd[2]),
    };
  }

  const timeOnly = TIME_ONLY_PATTERN.exec(trimmed);
  if (timeOnly) {
    return {
      caLabel: "",
      thu: [],
      gioBatDau: normalizeTime(timeOnly[1]),
      gioKetThuc: normalizeTime(timeOnly[2]),
    };
  }

  const timeStartOnly = TIME_START_PARTIAL_PATTERN.exec(trimmed);
  if (timeStartOnly) {
    return {
      caLabel: "",
      thu: [],
      gioBatDau: normalizeTime(timeStartOnly[1]),
      gioKetThuc: "",
    };
  }

  const timeEndOnly = TIME_END_PARTIAL_PATTERN.exec(trimmed);
  if (timeEndOnly) {
    return {
      caLabel: "",
      thu: [],
      gioBatDau: "",
      gioKetThuc: normalizeTime(timeEndOnly[1]),
    };
  }

  const caDays = CA_DAYS_PATTERN.exec(trimmed);
  if (caDays) {
    return {
      caLabel: caDays[1].trim(),
      thu: parseThuGroup(caDays[2]),
      gioBatDau: "",
      gioKetThuc: "",
    };
  }

  return { caLabel: trimmed, thu: [], gioBatDau: "", gioKetThuc: "" };
}

export function formatLichCaHoc(draft: LichCaHocDraft): string | null {
  const ca = draft.caLabel.trim();
  const days = formatThuGroup(draft.thu);
  const start = normalizeTime(draft.gioBatDau);
  const end = normalizeTime(draft.gioKetThuc);

  const caDays = [ca, days].filter(Boolean).join(" · ");
  const timePart =
    start && end
      ? `${start}–${end}`
      : start
        ? `${start}–`
        : end
          ? `–${end}`
          : "";

  if (!caDays && !timePart) return null;
  if (timePart) {
    return caDays ? `${caDays} — ${timePart}` : timePart;
  }
  return caDays || null;
}

/** Slot có thứ hoặc giờ — đủ để lưu vào danh sách. */
export function isLichCaHocSlotReady(draft: LichCaHocDraft): boolean {
  return Boolean(
    draft.thu.length > 0 ||
      draft.gioBatDau.trim() ||
      draft.gioKetThuc.trim() ||
      draft.caLabel.trim(),
  );
}

const SLOT_SEP = " ·· ";

/** Nhiều khung giờ — nối bằng ` ·· ` (tương thích chuỗi cũ 1 slot). */
export function parseLichCaHocList(
  raw: string | null | undefined,
): LichCaHocDraft[] {
  const trimmed = raw?.trim();
  if (!trimmed || isDefaultLichHoc(trimmed)) return [];
  const parts = trimmed.includes(" ·· ")
    ? trimmed.split(/\s*··\s*/).map((p) => p.trim()).filter(Boolean)
    : [trimmed];
  return parts
    .map((p) => parseLichCaHoc(p))
    .filter((d) => formatLichCaHoc(d) != null);
}

export function formatLichCaHocList(
  slots: LichCaHocDraft[],
): string | null {
  const parts = slots
    .map((s) => formatLichCaHoc(s))
    .filter((s): s is string => Boolean(s));
  if (parts.length === 0) return null;
  return parts.join(SLOT_SEP);
}

/** Ghép dữ liệu card (tenLop + gio) thành chuỗi form. */
export function composeLichCaHocFromParts(
  tenLop: string | null | undefined,
  lichHoc: string | null | undefined,
): string {
  const ten = tenLop?.trim() || "";
  const lich = lichHoc?.trim() || "";
  if (!ten && !lich) return "";
  if (ten && lich && ten !== lich) {
    if (TIME_ONLY_PATTERN.test(lich)) return `${ten} — ${lich}`;
    return lich;
  }
  return lich || ten;
}

export function splitLichCaHocDisplay(lichHoc: string | null | undefined): {
  tenLop: string | null;
  gioHoc: string | null;
  lichHoc: string | null;
} {
  const trimmed = lichHoc?.trim() || null;
  if (!trimmed || isDefaultLichHoc(trimmed)) {
    return { tenLop: null, gioHoc: null, lichHoc: null };
  }

  const slots = parseLichCaHocList(trimmed);
  if (slots.length === 0) {
    return { tenLop: trimmed, gioHoc: null, lichHoc: trimmed };
  }

  if (slots.length > 1) {
    const joined = formatLichCaHocList(slots);
    return { tenLop: joined, gioHoc: null, lichHoc: joined };
  }

  const draft = slots[0]!;
  const days = formatThuGroup(draft.thu);
  const caDays = [draft.caLabel.trim(), days].filter(Boolean).join(" · ");
  const hasTime = Boolean(draft.gioBatDau && draft.gioKetThuc);
  const gioHoc = hasTime ? `${draft.gioBatDau}–${draft.gioKetThuc}` : null;

  if (caDays && gioHoc) {
    return { tenLop: caDays, gioHoc, lichHoc: gioHoc };
  }
  if (caDays) {
    return { tenLop: caDays, gioHoc: null, lichHoc: trimmed };
  }
  if (gioHoc) {
    return { tenLop: null, gioHoc, lichHoc: gioHoc };
  }
  return { tenLop: trimmed, gioHoc: null, lichHoc: trimmed };
}
