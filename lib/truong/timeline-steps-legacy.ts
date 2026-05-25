import {
  formatTimelineDate,
  getStepStatus,
  type TimelineStepStatus,
} from "@/lib/truong/timeline";
import type { TuyenSinhTimelineStep } from "@/lib/truong/timeline-moc";
import type { TruongTuyenSinhNamRow } from "@/lib/truong/types";

function formatDateRange(
  from: string | null | undefined,
  to: string | null | undefined,
): string | null {
  const a = formatTimelineDate(from);
  const b = formatTimelineDate(to);
  if (a && b && a !== b) return `${a} – ${b}`;
  return a ?? b;
}

function monthYearLabel(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.toLocaleDateString("vi-VN", { month: "long" });
  const year = d.getFullYear();
  return `Tháng ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${year}`;
}

/** Lịch mốc cố định từ các cột ngày (fallback khi chưa có JSON tùy chỉnh). */
export function buildTuyenSinhTimelineStepsLegacy(
  row: TruongTuyenSinhNamRow,
): TuyenSinhTimelineStep[] {
  const plainNote =
    row.ghi_chu_timeline?.trim() &&
    !row.ghi_chu_timeline.trim().startsWith("{")
      ? row.ghi_chu_timeline.trim()
      : null;

  const steps: Omit<TuyenSinhTimelineStep, "status" | "dot" | "link">[] = [];

  const mo = formatDateRange(row.ngay_mo_ho_so, row.ngay_dong_ho_so);
  if (mo) {
    steps.push({
      id: "mo-ho-so",
      label: "Mở nhận hồ sơ đăng ký",
      dateLabel: mo,
      desc: plainNote,
    });
  }

  const dong = formatTimelineDate(row.ngay_dong_ho_so);
  if (dong) {
    steps.push({
      id: "dong-ho-so",
      label: "Hạn cuối nộp hồ sơ",
      dateLabel: dong,
      desc: null,
    });
  }

  const thi = formatDateRange(row.ngay_thi_tu, row.ngay_thi_den);
  if (thi) {
    steps.push({
      id: "thi",
      label: "Kỳ thi / thi năng khiếu",
      dateLabel: thi,
      desc: "Chi tiết môn thi theo ngành — xem tab Ngành học.",
    });
  }

  const congBo =
    formatTimelineDate(row.ngay_cong_bo_diem) ??
    monthYearLabel(row.ngay_cong_bo_diem);
  if (congBo) {
    steps.push({
      id: "cong-bo",
      label: "Công bố điểm & điểm chuẩn",
      dateLabel: congBo,
      desc: "Tra cứu trên website trường hoặc kênh thông báo đã đăng ký.",
    });
  }

  const nhap = formatDateRange(
    row.ngay_xac_nhan_nhap_hoc_tu,
    row.ngay_xac_nhan_nhap_hoc_den,
  );
  if (nhap) {
    steps.push({
      id: "nhap-hoc",
      label: "Xác nhận nhập học",
      dateLabel: nhap,
      desc: "Nộp hồ sơ nhập học, đóng học phí và đăng ký ký túc xá nếu cần.",
    });
  }

  return steps.map((step, i) => {
    let status: TimelineStepStatus = "upcoming";
    switch (step.id) {
      case "mo-ho-so":
        status = getStepStatus(row.ngay_mo_ho_so, row.ngay_dong_ho_so);
        break;
      case "dong-ho-so":
        status = getStepStatus(row.ngay_dong_ho_so, row.ngay_thi_tu);
        break;
      case "thi":
        status = getStepStatus(row.ngay_thi_tu, row.ngay_thi_den);
        break;
      case "cong-bo":
        status = getStepStatus(
          row.ngay_cong_bo_diem,
          row.ngay_xac_nhan_nhap_hoc_tu,
        );
        break;
      case "nhap-hoc":
        status = getStepStatus(
          row.ngay_xac_nhan_nhap_hoc_tu,
          row.ngay_xac_nhan_nhap_hoc_den,
        );
        break;
      default:
        status = "upcoming";
    }

    const dot =
      status === "done" ? "✓" : status === "active" ? "→" : String(i + 1);

    let dateLabel = step.dateLabel;
    if (status === "active") {
      dateLabel = `${dateLabel} · Đang diễn ra`;
    }

    return { ...step, status, dot, dateLabel, link: null };
  });
}
