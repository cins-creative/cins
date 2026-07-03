import { labelTinhThanh } from "@/lib/truong/contact";
import type { StudioJob } from "@/lib/to-chuc/studio-tuyen-dung-types";

/** Nơi làm việc hiển thị (Remote nếu làm từ xa). */
export function studioJobPlace(job: StudioJob): string {
  if (job.lamTuXa) return "Remote";
  return labelTinhThanh(job.tinhThanh) ?? "Linh hoạt";
}

/** Khoảng lương hiển thị (null nếu ẩn lương). */
export function formatStudioSalary(job: StudioJob): string | null {
  if (!job.hienThiLuong) return null;
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  if (job.mucLuongTu && job.mucLuongDen) {
    return `${fmt(job.mucLuongTu)} – ${fmt(job.mucLuongDen)} đ`;
  }
  if (job.mucLuongTu) return `Từ ${fmt(job.mucLuongTu)} đ`;
  if (job.mucLuongDen) return `Đến ${fmt(job.mucLuongDen)} đ`;
  return null;
}

/** Hạn nộp hiển thị "Hạn nộp dd/mm/yyyy" (null nếu không có / sai định dạng). */
export function formatStudioDeadline(hanNop: string | null): string | null {
  if (!hanNop) return null;
  const d = new Date(hanNop);
  if (Number.isNaN(d.getTime())) return null;
  return `Hạn nộp ${d.toLocaleDateString("vi-VN")}`;
}
