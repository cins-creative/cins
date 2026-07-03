import {
  formatTimelineDate,
  getStepStatus,
  type TimelineStepStatus,
} from "@/lib/truong/timeline";
import { buildTuyenSinhTimelineStepsLegacy } from "@/lib/truong/timeline-steps-legacy";
import type { TruongTuyenSinhNamRow } from "@/lib/truong/types";

export type TuyenSinhTimelineStep = {
  id: string;
  label: string;
  dateLabel: string;
  desc: string | null;
  link: string | null;
  status: TimelineStepStatus;
  dot: string;
};

export const TIMELINE_MOC_LABEL_MAX = 80;
export const TIMELINE_MOC_DESC_MAX = 200;
export const TIMELINE_MOC_LINK_MAX = 500;
export const TIMELINE_MOC_MAX_ITEMS = 12;

export type TuyenSinhTimelineMoc = {
  id: string;
  label: string;
  ngay_tu: string | null;
  ngay_den: string | null;
  mo_ta: string | null;
  link: string | null;
};

type TimelineMocStore = {
  v: 1;
  moc: TuyenSinhTimelineMoc[];
};

export function newTimelineMocId(): string {
  return `moc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Mốc có kèm giờ cụ thể (`YYYY-MM-DDTHH:mm`) hay chỉ có ngày. */
export function mocHasTime(v: string | null | undefined): boolean {
  return /T\d{2}:\d{2}/.test(v?.trim() ?? "");
}

/** Ép chuỗi ngày có phần giờ (mặc định `T00:00` nếu đang chỉ có ngày). */
export function withMocTime(v: string | null | undefined): string | null {
  const raw = v?.trim();
  if (!raw) return null;
  if (mocHasTime(raw)) return raw.slice(0, 16);
  return `${raw.slice(0, 10)}T00:00`;
}

/** Bỏ phần giờ, chỉ giữ ngày (`YYYY-MM-DD`). */
export function withoutMocTime(v: string | null | undefined): string | null {
  const raw = v?.trim();
  if (!raw) return null;
  return raw.slice(0, 10);
}

export function emptyTimelineMoc(): TuyenSinhTimelineMoc {
  return {
    id: newTimelineMocId(),
    label: "",
    ngay_tu: null,
    ngay_den: null,
    mo_ta: null,
    link: null,
  };
}

function trimToMax(s: string, max: number): string {
  return s.trim().slice(0, max);
}

export function normalizeTimelineMoc(raw: TuyenSinhTimelineMoc): TuyenSinhTimelineMoc | null {
  const label = trimToMax(raw.label ?? "", TIMELINE_MOC_LABEL_MAX);
  if (!label) return null;
  const ngay_tu = raw.ngay_tu?.trim() || null;
  const ngay_den = raw.ngay_den?.trim() || null;
  const mo_ta = raw.mo_ta?.trim()
    ? trimToMax(raw.mo_ta, TIMELINE_MOC_DESC_MAX)
    : null;
  const link = raw.link?.trim()
    ? trimToMax(raw.link, TIMELINE_MOC_LINK_MAX)
    : null;
  if (!ngay_tu && !ngay_den) return null;
  return {
    id: raw.id?.trim() || newTimelineMocId(),
    label,
    ngay_tu,
    ngay_den,
    mo_ta,
    link,
  };
}

export function parseTimelineMocStore(
  ghi_chu_timeline: string | null | undefined,
): TuyenSinhTimelineMoc[] | null {
  const raw = ghi_chu_timeline?.trim();
  if (!raw?.startsWith("{")) return null;
  try {
    const o = JSON.parse(raw) as TimelineMocStore;
    if (o?.v !== 1 || !Array.isArray(o.moc)) return null;
    const out: TuyenSinhTimelineMoc[] = [];
    for (const item of o.moc) {
      const n = normalizeTimelineMoc(item as TuyenSinhTimelineMoc);
      if (n) out.push(n);
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

export function serializeTimelineMocStore(moc: TuyenSinhTimelineMoc[]): string {
  const cleaned = moc
    .map((m) => normalizeTimelineMoc(m))
    .filter((m): m is TuyenSinhTimelineMoc => m != null)
    .slice(0, TIMELINE_MOC_MAX_ITEMS);
  const payload: TimelineMocStore = { v: 1, moc: cleaned };
  return JSON.stringify(payload);
}

function formatMocDateRange(
  tu: string | null,
  den: string | null,
): string | null {
  const a = formatTimelineDate(tu);
  const b = formatTimelineDate(den);
  if (a && b && a !== b) return `${a} – ${b}`;
  return a ?? b;
}

/** Khóa sắp xếp theo ngày bắt đầu (ưu tiên `ngay_tu`, fallback `ngay_den`). */
export function mocDateSortKey(
  ngay_tu: string | null | undefined,
  ngay_den: string | null | undefined,
): number {
  const iso = ngay_tu?.trim() || ngay_den?.trim();
  if (!iso) return Number.MAX_SAFE_INTEGER;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

function sortMocByDate(moc: TuyenSinhTimelineMoc[]): TuyenSinhTimelineMoc[] {
  return [...moc].sort((a, b) => {
    const diff =
      mocDateSortKey(a.ngay_tu, a.ngay_den) -
      mocDateSortKey(b.ngay_tu, b.ngay_den);
    if (diff !== 0) return diff;
    return a.label.localeCompare(b.label, "vi");
  });
}

function refreshTimelineStepDots(
  steps: TuyenSinhTimelineStep[],
): TuyenSinhTimelineStep[] {
  let upcoming = 1;
  return steps.map((step) => {
    const dot =
      step.status === "done"
        ? "✓"
        : step.status === "active"
          ? "→"
          : String(upcoming++);
    return { ...step, dot };
  });
}

function legacyStepSortKey(
  row: TruongTuyenSinhNamRow,
  stepId: string,
): number {
  return mocDateSortKey(
    dateFromLegacyStep(row, stepId, "tu"),
    dateFromLegacyStep(row, stepId, "den"),
  );
}

export function sortTimelineStepsByDate(
  steps: TuyenSinhTimelineStep[],
  row?: TruongTuyenSinhNamRow | null,
): TuyenSinhTimelineStep[] {
  if (!row) return refreshTimelineStepDots(steps);
  const sorted = [...steps].sort(
    (a, b) => legacyStepSortKey(row, a.id) - legacyStepSortKey(row, b.id),
  );
  return refreshTimelineStepDots(sorted);
}

/** Preview trong editor — cho phép mốc chưa đủ ngày, vẫn khớp form. */
export function buildTimelineStepsFromMocDraft(
  moc: TuyenSinhTimelineMoc[],
): TuyenSinhTimelineStep[] {
  const items = moc.filter(
    (m) =>
      (m.label?.trim() ?? "") !== "" ||
      Boolean(m.ngay_tu?.trim()) ||
      Boolean(m.ngay_den?.trim()) ||
      Boolean(m.mo_ta?.trim()) ||
      Boolean(m.link?.trim()),
  );

  const sorted = sortMocByDate(items);

  return refreshTimelineStepDots(
    sorted.map((m, i) => {
    const label =
      trimToMax(m.label ?? "", TIMELINE_MOC_LABEL_MAX) || `Mốc ${i + 1}`;
    const ngay_tu = m.ngay_tu?.trim() || null;
    const ngay_den = m.ngay_den?.trim() || null;
    const mo_ta = m.mo_ta?.trim()
      ? trimToMax(m.mo_ta, TIMELINE_MOC_DESC_MAX)
      : null;
    const link = m.link?.trim()
      ? trimToMax(m.link, TIMELINE_MOC_LINK_MAX)
      : null;
    const status: TimelineStepStatus =
      ngay_tu || ngay_den ? getStepStatus(ngay_tu, ngay_den) : "upcoming";
    let dateLabel =
      formatMocDateRange(ngay_tu, ngay_den) ?? "Chưa nhập ngày";
    if (status === "active" && dateLabel !== "Chưa nhập ngày") {
      dateLabel = `${dateLabel} · Đang diễn ra`;
    }
    return {
      id: m.id?.trim() || `draft-${i}`,
      label,
      dateLabel,
      desc: mo_ta,
      link,
      status,
      dot: "",
    };
  }),
  );
}

export function buildTimelineStepsFromMoc(
  moc: TuyenSinhTimelineMoc[],
): TuyenSinhTimelineStep[] {
  const items = sortMocByDate(
    moc
      .map((m) => normalizeTimelineMoc(m))
      .filter((m): m is TuyenSinhTimelineMoc => m != null),
  );

  return refreshTimelineStepDots(
    items.map((m) => {
    const status: TimelineStepStatus = getStepStatus(m.ngay_tu, m.ngay_den);
    let dateLabel = formatMocDateRange(m.ngay_tu, m.ngay_den) ?? "—";
    if (status === "active") {
      dateLabel = `${dateLabel} · Đang diễn ra`;
    }
    return {
      id: m.id,
      label: m.label,
      dateLabel,
      desc: m.mo_ta,
      link: m.link,
      status,
      dot: "",
    };
  }),
  );
}

/** Chuyển lịch cột ngày cũ → mốc tùy chỉnh (lần đầu mở editor). */
export function legacyTimelineToMoc(
  row: TruongTuyenSinhNamRow,
): TuyenSinhTimelineMoc[] {
  const steps = buildTuyenSinhTimelineStepsLegacy(row);
  return steps.map((s) => ({
    id: s.id,
    label: s.label,
    ngay_tu: dateFromLegacyStep(row, s.id, "tu"),
    ngay_den: dateFromLegacyStep(row, s.id, "den"),
    mo_ta: s.desc,
    link: null,
  }));
}

function dateFromLegacyStep(
  row: TruongTuyenSinhNamRow,
  stepId: string,
  which: "tu" | "den",
): string | null {
  const iso = (v: string | null | undefined) => {
    if (!v?.trim()) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  };
  switch (stepId) {
    case "mo-ho-so":
      return which === "tu" ? iso(row.ngay_mo_ho_so) : iso(row.ngay_dong_ho_so);
    case "dong-ho-so":
      return iso(row.ngay_dong_ho_so);
    case "thi":
      return which === "tu" ? iso(row.ngay_thi_tu) : iso(row.ngay_thi_den);
    case "cong-bo":
      return iso(row.ngay_cong_bo_diem);
    case "nhap-hoc":
      return which === "tu"
        ? iso(row.ngay_xac_nhan_nhap_hoc_tu)
        : iso(row.ngay_xac_nhan_nhap_hoc_den);
    default:
      return null;
  }
}

export function resolveTimelineMocForRow(
  row: TruongTuyenSinhNamRow | null,
): TuyenSinhTimelineMoc[] {
  if (!row) return [];
  const custom = parseTimelineMocStore(row.ghi_chu_timeline);
  if (custom?.length) return custom;
  return legacyTimelineToMoc(row);
}

export function isTimelineMocJson(
  ghi_chu_timeline: string | null | undefined,
): boolean {
  return Boolean(ghi_chu_timeline?.trim().startsWith("{"));
}

/** Gộp lịch tuyển sinh theo năm (mọi ngành cùng `nam`). */
export function aggregateTimelineForYear(
  rows: TruongTuyenSinhNamRow[],
): TruongTuyenSinhNamRow | null {
  if (!rows.length) return null;
  const pick = (key: keyof TruongTuyenSinhNamRow) => {
    for (const row of rows) {
      const v = row[key];
      if (typeof v === "string" && v.trim()) return v;
    }
    return null;
  };
  const link =
    rows.map((r) => r.link_thong_tin?.trim()).find(Boolean) ?? null;
  const ghiChu =
    rows
      .map((r) => r.ghi_chu_timeline?.trim())
      .find((g) => g?.startsWith("{")) ??
    rows.find((r) => r.ghi_chu_timeline)?.ghi_chu_timeline ??
    null;
  return {
    ngay_mo_ho_so: pick("ngay_mo_ho_so"),
    ngay_dong_ho_so: pick("ngay_dong_ho_so"),
    ngay_thi_tu: pick("ngay_thi_tu"),
    ngay_thi_den: pick("ngay_thi_den"),
    ngay_cong_bo_diem: pick("ngay_cong_bo_diem"),
    ngay_xac_nhan_nhap_hoc_tu: pick("ngay_xac_nhan_nhap_hoc_tu"),
    ngay_xac_nhan_nhap_hoc_den: pick("ngay_xac_nhan_nhap_hoc_den"),
    ghi_chu_timeline: ghiChu,
    link_thong_tin: link,
  } as TruongTuyenSinhNamRow;
}

export function timelineLinkHref(link: string): string {
  return link.startsWith("http") ? link : `https://${link}`;
}

export function timelineLinkLabel(link: string): string {
  return link.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/** Mốc đã qua vs mốc hiện tại / tiếp theo (gần nhất) cho sidebar lịch tuyển sinh. */
export function getAdmissionTimelineFocus(steps: TuyenSinhTimelineStep[]): {
  pastIds: Set<string>;
  currentId: string | null;
  nextId: string | null;
} {
  const pastIds = new Set<string>();
  for (const step of steps) {
    if (step.status === "done") pastIds.add(step.id);
  }

  const active = steps.find((s) => s.status === "active");
  if (active) {
    const activeIdx = steps.findIndex((s) => s.id === active.id);
    const next = steps.slice(activeIdx + 1).find((s) => s.status === "upcoming");
    return { pastIds, currentId: active.id, nextId: next?.id ?? null };
  }

  const firstUpcoming = steps.find((s) => s.status === "upcoming");
  return { pastIds, currentId: null, nextId: firstUpcoming?.id ?? null };
}

/** Trích năm lịch từ chuỗi ngày ISO / datetime. */
export function parseCalendarYearFromDate(
  raw: string | null | undefined,
): number | null {
  const s = raw?.trim();
  if (!s) return null;
  const isoDay = s.slice(0, 10).match(/^(\d{4})-\d{2}-\d{2}$/);
  if (isoDay) {
    const y = Number(isoDay[1]);
    return y >= 2000 && y <= 2100 ? y : null;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  return y >= 2000 && y <= 2100 ? y : null;
}

const TIMELINE_ROW_DATE_FIELDS: (keyof TruongTuyenSinhNamRow)[] = [
  "ngay_mo_ho_so",
  "ngay_dong_ho_so",
  "ngay_thi_tu",
  "ngay_thi_den",
  "ngay_cong_bo_diem",
  "ngay_xac_nhan_nhap_hoc_tu",
  "ngay_xac_nhan_nhap_hoc_den",
];

/** Năm lịch trích từ ngày mốc / cột ngày (không gộp `nam` tuyển sinh). */
export function collectTimelineDateYearsFromRow(
  row: TruongTuyenSinhNamRow,
): number[] {
  const years = new Set<number>();

  for (const key of TIMELINE_ROW_DATE_FIELDS) {
    const y = parseCalendarYearFromDate(row[key] as string | null);
    if (y) years.add(y);
  }

  for (const moc of resolveTimelineMocForRow(row)) {
    const yt = parseCalendarYearFromDate(moc.ngay_tu);
    const yd = parseCalendarYearFromDate(moc.ngay_den);
    if (yt) years.add(yt);
    if (yd) years.add(yd);
  }

  return [...years];
}

/** Mọi năm lịch (calendar + `nam`) — dùng merge year filter tab Ngành / TS. */
export function collectCalendarYearsFromRow(
  row: TruongTuyenSinhNamRow,
): number[] {
  const years = new Set<number>(collectTimelineDateYearsFromRow(row));
  if (row.nam > 0) years.add(row.nam);
  return [...years];
}

/** Năm lịch cho dropdown sidebar — chỉ từ ngày mốc (mới → cũ). */
export function collectTimelineCalendarYears(
  rows: TruongTuyenSinhNamRow[],
): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    for (const y of collectTimelineDateYearsFromRow(row)) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export function tuyenSinhRowMatchesCalendarYear(
  row: TruongTuyenSinhNamRow,
  year: number,
): boolean {
  return collectTimelineDateYearsFromRow(row).includes(year);
}

export function mocMatchesCalendarYear(
  moc: TuyenSinhTimelineMoc,
  year: number,
): boolean {
  const yt = parseCalendarYearFromDate(moc.ngay_tu);
  const yd = parseCalendarYearFromDate(moc.ngay_den);
  return yt === year || yd === year;
}

function legacyStepMatchesCalendarYear(
  row: TruongTuyenSinhNamRow,
  stepId: string,
  year: number,
): boolean {
  const match = (raw: string | null | undefined) =>
    parseCalendarYearFromDate(raw) === year;

  switch (stepId) {
    case "mo-ho-so":
      return match(row.ngay_mo_ho_so) || match(row.ngay_dong_ho_so);
    case "dong-ho-so":
      return match(row.ngay_dong_ho_so);
    case "thi":
      return match(row.ngay_thi_tu) || match(row.ngay_thi_den);
    case "cong-bo":
      return match(row.ngay_cong_bo_diem);
    case "nhap-hoc":
      return (
        match(row.ngay_xac_nhan_nhap_hoc_tu) ||
        match(row.ngay_xac_nhan_nhap_hoc_den)
      );
    default:
      return false;
  }
}

/** Timeline sidebar — chỉ mốc có ngày rơi vào năm lịch chọn. */
export function buildTuyenSinhTimelineStepsForCalendarYear(
  row: TruongTuyenSinhNamRow,
  year: number,
): TuyenSinhTimelineStep[] {
  const raw = row.ghi_chu_timeline?.trim();
  if (raw?.startsWith("{")) {
    const custom = parseTimelineMocStore(raw);
    if (!custom?.length) return [];
    const filtered = custom.filter((m) => mocMatchesCalendarYear(m, year));
    return buildTimelineStepsFromMoc(filtered);
  }
  const legacy = buildTuyenSinhTimelineStepsLegacy(row);
  return sortTimelineStepsByDate(
    legacy.filter((step) =>
      legacyStepMatchesCalendarYear(row, step.id, year),
    ),
    row,
  );
}

export function buildTuyenSinhTimelineSteps(
  row: TruongTuyenSinhNamRow,
): TuyenSinhTimelineStep[] {
  const raw = row.ghi_chu_timeline?.trim();
  if (raw?.startsWith("{")) {
    const custom = parseTimelineMocStore(raw);
    return custom?.length ? buildTimelineStepsFromMoc(custom) : [];
  }
  return sortTimelineStepsByDate(buildTuyenSinhTimelineStepsLegacy(row), row);
}
