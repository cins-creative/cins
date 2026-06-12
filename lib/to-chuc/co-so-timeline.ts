import {
  formatKhaiGiangCard,
  isKhoaHocMuted,
} from "@/lib/to-chuc/khoa-hoc-labels";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import { formatTimelineDate, getStepStatus } from "@/lib/truong/timeline";
import type { TuyenSinhTimelineStep } from "@/lib/truong/timeline-steps";
import {
  mocDateSortKey,
  mocMatchesCalendarYear,
  parseCalendarYearFromDate,
  type TuyenSinhTimelineMoc,
} from "@/lib/truong/timeline-moc";
import { defaultTruongNganhYear } from "@/lib/truong/diem-chuan";

const AUTO_PIN_PREFIX = "auto-pin:";

export function isCoSoAutoPinStepId(id: string): boolean {
  return id.startsWith(AUTO_PIN_PREFIX);
}

export function parseCoSoAutoPinKhoaId(stepId: string): string | null {
  if (!isCoSoAutoPinStepId(stepId)) return null;
  const khoaId = stepId.slice(AUTO_PIN_PREFIX.length).trim();
  return khoaId || null;
}

function isAutoPinKhoa(k: KhoaHocCardData): boolean {
  if (isKhoaHocMuted(k.trangThaiKhoaHoc)) return false;
  if (k.loaiMoHinh === "lien_tuc_theo_thang") return true;
  return Boolean(k.ngayKhaiGiangGanNhat);
}

function buildAutoPinStep(
  k: KhoaHocCardData,
  orgSlug: string,
): TuyenSinhTimelineStep {
  const href = coSoKhoaHocDetailPath(orgSlug, k.slug);
  if (k.loaiMoHinh === "lien_tuc_theo_thang") {
    const weeklyLabel = "Khai giảng hàng tuần";
    const lich = k.lichHoc?.trim();
    const desc =
      lich && lich.toLocaleLowerCase("vi") !== weeklyLabel.toLocaleLowerCase("vi")
        ? lich
        : "Vào học bất cứ lúc nào";
    return {
      id: `${AUTO_PIN_PREFIX}${k.id}`,
      label: k.tenKhoaHoc,
      dateLabel: weeklyLabel,
      desc,
      link: href,
      status: "active",
      dot: "→",
    };
  }

  const ngay = k.ngayKhaiGiangGanNhat!;
  const status = getStepStatus(ngay, ngay);
  let dateLabel = formatKhaiGiangCard(k.loaiMoHinh, ngay);
  if (status === "active") {
    const formatted = formatTimelineDate(ngay);
    if (formatted) dateLabel = `${formatted} · Đang diễn ra`;
  }
  return {
    id: `${AUTO_PIN_PREFIX}${k.id}`,
    label: k.tenKhoaHoc,
    dateLabel,
    desc: k.lichHoc?.trim() || null,
    link: href,
    status,
    dot: status === "done" ? "✓" : status === "active" ? "→" : "",
  };
}

/** Mốc khai giảng tự động từ khóa học — luôn ghim đầu sidebar. */
export function buildCoSoAutoPinSteps(
  khoaList: KhoaHocCardData[],
  orgSlug: string,
): TuyenSinhTimelineStep[] {
  const entries = khoaList
    .filter(isAutoPinKhoa)
    .map((k) => ({ k, step: buildAutoPinStep(k, orgSlug) }));

  entries.sort((a, b) => {
    const aWeekly = a.k.loaiMoHinh === "lien_tuc_theo_thang";
    const bWeekly = b.k.loaiMoHinh === "lien_tuc_theo_thang";
    if (aWeekly !== bWeekly) return aWeekly ? -1 : 1;
    if (aWeekly && bWeekly) {
      return a.k.tenKhoaHoc.localeCompare(b.k.tenKhoaHoc, "vi");
    }
    const aKey = mocDateSortKey(a.k.ngayKhaiGiangGanNhat, null);
    const bKey = mocDateSortKey(b.k.ngayKhaiGiangGanNhat, null);
    if (aKey !== bKey) return aKey - bKey;
    return a.k.tenKhoaHoc.localeCompare(b.k.tenKhoaHoc, "vi");
  });

  return entries.map((e) => e.step);
}

/** Năm lịch cho dropdown mốc thông báo tùy chỉnh. */
export function collectCoSoTimelineYears(
  moc: TuyenSinhTimelineMoc[],
): number[] {
  const years = new Set<number>();
  for (const item of moc) {
    const yt = parseCalendarYearFromDate(item.ngay_tu);
    const yd = parseCalendarYearFromDate(item.ngay_den);
    if (yt) years.add(yt);
    if (yd) years.add(yd);
  }
  if (!years.size) years.add(defaultTruongNganhYear());
  return [...years].sort((a, b) => b - a);
}

export function filterCoSoTimelineMocForYear(
  moc: TuyenSinhTimelineMoc[],
  year: number,
): TuyenSinhTimelineMoc[] {
  return moc.filter((item) => mocMatchesCalendarYear(item, year));
}
