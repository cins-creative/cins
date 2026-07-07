import {
  isKhoaHocMuted,
} from "@/lib/to-chuc/khoa-hoc-labels";
import type { KhoaHocCardData, LoaiMoHinhKhoa } from "@/lib/to-chuc/khoa-hoc-types";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import { formatTimelineDate, getStepStatus } from "@/lib/truong/timeline";
import type { TuyenSinhTimelineStep } from "@/lib/truong/timeline-steps";
import {
  mocDateSortKey,
  parseCalendarYearFromDate,
} from "@/lib/truong/timeline-moc";

import { AUTO_PIN_LOP_PREFIX } from "./co-so-timeline";

export type CoSoLopTimelinePin = {
  lopId: string;
  khoaId: string;
  khoaSlug: string;
  tenKhoaHoc: string;
  maLop: string | null;
  ngayKhaiGiang: string;
  lichHoc: string | null;
  loaiMoHinh: LoaiMoHinhKhoa;
};

export function lopPinMatchesCalendarYear(
  pin: CoSoLopTimelinePin,
  year: number,
): boolean {
  return parseCalendarYearFromDate(pin.ngayKhaiGiang) === year;
}

export function collectCoSoLopTimelineYears(
  pins: CoSoLopTimelinePin[],
): number[] {
  const years = new Set<number>();
  for (const pin of pins) {
    const y = parseCalendarYearFromDate(pin.ngayKhaiGiang);
    if (y) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

function buildLopAutoPinStep(
  pin: CoSoLopTimelinePin,
  orgSlug: string,
): TuyenSinhTimelineStep {
  const ngay = pin.ngayKhaiGiang;
  const status = getStepStatus(ngay, ngay);
  const formatted = formatTimelineDate(ngay);
  let dateLabel = formatted ?? ngay;
  if (status === "active" && formatted) {
    dateLabel = `${formatted} · Đang diễn ra`;
  }
  const lopLabel = pin.maLop?.trim() || "Lớp học";
  return {
    id: `${AUTO_PIN_LOP_PREFIX}${pin.lopId}`,
    label: `Khai giảng lớp · ${lopLabel}`,
    dateLabel,
    desc: `Khóa ${pin.tenKhoaHoc}`,
    link: coSoKhoaHocDetailPath(orgSlug, pin.khoaSlug),
    status,
    dot: status === "done" ? "✓" : status === "active" ? "→" : "",
    countdownStartIso: ngay,
    countdownEndIso: null,
  };
}

/** Mốc khai giảng tự động — một mốc cho mỗi lớp (chỉ ngày khai giảng). */
export function buildCoSoLopAutoPinSteps(
  pins: CoSoLopTimelinePin[],
  orgSlug: string,
  year?: number,
): TuyenSinhTimelineStep[] {
  const filtered =
    year != null ? pins.filter((p) => lopPinMatchesCalendarYear(p, year)) : pins;
  return [...filtered]
    .sort(
      (a, b) =>
        mocDateSortKey(a.ngayKhaiGiang, null) -
          mocDateSortKey(b.ngayKhaiGiang, null) ||
        a.tenKhoaHoc.localeCompare(b.tenKhoaHoc, "vi") ||
        (a.maLop ?? "").localeCompare(b.maLop ?? "", "vi"),
    )
    .map((pin) => buildLopAutoPinStep(pin, orgSlug));
}

export function mapCoSoLopTimelinePinRows(
  rows: Array<{
    id: string;
    ma_lop: string;
    ngay_khai_giang: string;
    lich_hoc?: string | null;
    org_khoa_hoc:
      | {
          id: string;
          slug: string;
          ten_khoa_hoc: string;
          loai_mo_hinh: LoaiMoHinhKhoa;
          trang_thai_khoa_hoc: KhoaHocCardData["trangThaiKhoaHoc"];
        }
      | {
          id: string;
          slug: string;
          ten_khoa_hoc: string;
          loai_mo_hinh: LoaiMoHinhKhoa;
          trang_thai_khoa_hoc: KhoaHocCardData["trangThaiKhoaHoc"];
        }[];
  }>,
): CoSoLopTimelinePin[] {
  const out: CoSoLopTimelinePin[] = [];
  for (const row of rows) {
    const khoa = Array.isArray(row.org_khoa_hoc)
      ? row.org_khoa_hoc[0]
      : row.org_khoa_hoc;
    if (!khoa?.id || isKhoaHocMuted(khoa.trang_thai_khoa_hoc)) continue;
    const ngay = row.ngay_khai_giang?.trim();
    if (!ngay) continue;
    out.push({
      lopId: row.id,
      khoaId: khoa.id,
      khoaSlug: khoa.slug,
      tenKhoaHoc: khoa.ten_khoa_hoc,
      maLop: row.ma_lop?.trim() || null,
      ngayKhaiGiang: ngay,
      lichHoc: row.lich_hoc?.trim() || null,
      loaiMoHinh: khoa.loai_mo_hinh,
    });
  }
  return out;
}
