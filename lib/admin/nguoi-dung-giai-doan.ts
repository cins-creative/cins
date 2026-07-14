import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";

/** `chua_chon` = `giai_doan` null; `all` = không lọc. */
export type AdminGiaiDoanFilter = GiaiDoan | "chua_chon";

export type AdminGiaiDoanStats = Record<AdminGiaiDoanFilter | "all", number>;

export const ADMIN_GIAI_DOAN_FILTERS: ReadonlyArray<{
  id: AdminGiaiDoanFilter | "all";
  label: string;
}> = [
  { id: "all", label: "Tất cả" },
  { id: "moi_bat_dau", label: "Mới bắt đầu" },
  { id: "dang_hoc", label: "Đang học" },
  { id: "dang_lam", label: "Đang đi làm" },
  { id: "tim_viec", label: "Đang tìm việc" },
  { id: "freelance", label: "Freelance" },
  { id: "dang_day", label: "Giáo viên" },
  { id: "chua_chon", label: "Chưa chọn" },
];

export function emptyAdminGiaiDoanStats(): AdminGiaiDoanStats {
  return {
    all: 0,
    moi_bat_dau: 0,
    dang_hoc: 0,
    dang_lam: 0,
    tim_viec: 0,
    freelance: 0,
    dang_day: 0,
    chua_chon: 0,
  };
}
