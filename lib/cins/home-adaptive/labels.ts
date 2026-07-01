import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";

const GIAI_DOAN_LABEL: Record<GiaiDoan, string> = {
  moi_bat_dau: "Mới bắt đầu",
  dang_hoc: "Đang học",
  dang_lam: "Đang đi làm",
  tim_viec: "Đang tìm việc",
  freelance: "Freelance",
  dang_day: "Giáo viên",
};

/** Nhãn `giai_doan` hiển thị — fallback nhẹ khi null (FOUNDATIONS V4). */
export function giaiDoanLabel(giaiDoan: string | null | undefined): string {
  if (!giaiDoan) return "Thành viên CINs";
  return GIAI_DOAN_LABEL[giaiDoan as GiaiDoan] ?? "Thành viên CINs";
}
