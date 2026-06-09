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

  return items.map((m, i) => {
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
    const dot =
      status === "done" ? "✓" : status === "active" ? "→" : String(i + 1);
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
      dot,
    };
  });
}

export function buildTimelineStepsFromMoc(
  moc: TuyenSinhTimelineMoc[],
): TuyenSinhTimelineStep[] {
  const items = moc
    .map((m) => normalizeTimelineMoc(m))
    .filter((m): m is TuyenSinhTimelineMoc => m != null);

  return items.map((m, i) => {
    const status: TimelineStepStatus = getStepStatus(m.ngay_tu, m.ngay_den);
    const dot =
      status === "done" ? "✓" : status === "active" ? "→" : String(i + 1);
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
      dot,
    };
  });
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

/** Mọi năm lịch (calendar) xuất hiện trên mốc / cột ngày của một dòng tuyển sinh. */
export function collectCalendarYearsFromRow(
  row: TruongTuyenSinhNamRow,
): number[] {
  const years = new Set<number>();
  if (row.nam > 0) years.add(row.nam);

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

/** Năm lịch cho dropdown sidebar — từ ngày mốc timeline (mới → cũ). */
export function collectTimelineCalendarYears(
  rows: TruongTuyenSinhNamRow[],
): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    for (const y of collectCalendarYearsFromRow(row)) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export function tuyenSinhRowMatchesCalendarYear(
  row: TruongTuyenSinhNamRow,
  year: number,
): boolean {
  return collectCalendarYearsFromRow(row).includes(year);
}

export function buildTuyenSinhTimelineSteps(
  row: TruongTuyenSinhNamRow,
): TuyenSinhTimelineStep[] {
  const raw = row.ghi_chu_timeline?.trim();
  if (raw?.startsWith("{")) {
    const custom = parseTimelineMocStore(raw);
    return custom?.length ? buildTimelineStepsFromMoc(custom) : [];
  }
  return buildTuyenSinhTimelineStepsLegacy(row);
}
