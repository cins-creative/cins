/**
 * Catalog phúc lợi (quyền lợi) cho tin tuyển dụng studio/doanh nghiệp.
 *
 * Tham khảo bộ phúc lợi chuẩn của CareerViet (Chế độ bảo hiểm, Du lịch, Chế độ
 * thưởng, Chăm sóc sức khỏe, Đào tạo, Tăng lương, Phụ cấp, Laptop, Đồng phục,
 * Công tác phí, Xe đưa đón, CLB thể thao, Phụ cấp thâm niên…) + bổ sung các mục
 * đặc thù ngành sáng tạo (license phần mềm, thiết bị, môi trường studio).
 *
 * Không import React ở đây để dùng chung cho cả server (validate) và client.
 * Icon (lucide) map ở phía component qua field `icon` (string).
 */

export type StudioPhucLoiKey =
  | "bao_hiem"
  | "thuong"
  | "tang_luong"
  | "du_lich"
  | "suc_khoe"
  | "dao_tao"
  | "phu_cap"
  | "thiet_bi"
  | "phan_mem"
  | "dong_phuc"
  | "nghi_phep"
  | "linh_hoat"
  | "cong_tac_phi"
  | "xe_dua_don"
  | "the_thao"
  | "tham_nien"
  | "moi_truong";

export type StudioPhucLoiCatalogItem = {
  key: StudioPhucLoiKey;
  /** Nhãn hiển thị. */
  label: string;
  /** Tên icon lucide (map ở component). */
  icon: string;
  /** Gợi ý cho ô ghi chú tự nhập khi tick. */
  hint: string;
};

/** Một mục phúc lợi đã chọn của 1 tin tuyển dụng. */
export type StudioJobPhucLoiItem = {
  key: StudioPhucLoiKey;
  /** Ghi chú tự nhập (VD: "BHXH full lương") — null nếu chỉ tick. */
  note: string | null;
};

export const STUDIO_PHUC_LOI_CATALOG: readonly StudioPhucLoiCatalogItem[] = [
  {
    key: "bao_hiem",
    label: "Chế độ bảo hiểm",
    icon: "ShieldCheck",
    hint: "VD: BHXH / BHYT full lương ngay khi ký HĐ",
  },
  {
    key: "thuong",
    label: "Chế độ thưởng",
    icon: "Gift",
    hint: "VD: Lương tháng 13, thưởng dự án, thưởng lễ tết",
  },
  {
    key: "tang_luong",
    label: "Xét tăng lương",
    icon: "TrendingUp",
    hint: "VD: Review lương 6 tháng/lần theo hiệu suất",
  },
  {
    key: "du_lich",
    label: "Du lịch & Team building",
    icon: "Plane",
    hint: "VD: Du lịch công ty hằng năm, team building theo quý",
  },
  {
    key: "suc_khoe",
    label: "Chăm sóc sức khỏe",
    icon: "HeartPulse",
    hint: "VD: Bảo hiểm sức khỏe, khám sức khỏe định kỳ",
  },
  {
    key: "dao_tao",
    label: "Đào tạo & Phát triển",
    icon: "GraduationCap",
    hint: "VD: Khóa học kỹ năng, mentor 1-1, workshop nội bộ",
  },
  {
    key: "phu_cap",
    label: "Phụ cấp",
    icon: "Wallet",
    hint: "VD: Ăn trưa, gửi xe, điện thoại, xăng xe",
  },
  {
    key: "thiet_bi",
    label: "Trang thiết bị",
    icon: "MonitorSmartphone",
    hint: "VD: Laptop/PC cấu hình cao, màn hình phụ, bảng vẽ Wacom",
  },
  {
    key: "phan_mem",
    label: "License phần mềm",
    icon: "AppWindow",
    hint: "VD: Adobe CC, Maya, ZBrush, Figma bản quyền",
  },
  {
    key: "dong_phuc",
    label: "Đồng phục",
    icon: "Shirt",
    hint: "VD: Đồng phục / áo team studio",
  },
  {
    key: "nghi_phep",
    label: "Nghỉ phép",
    icon: "CalendarDays",
    hint: "VD: 12+ ngày phép/năm, nghỉ sinh nhật",
  },
  {
    key: "linh_hoat",
    label: "Giờ giấc linh hoạt",
    icon: "Clock",
    hint: "VD: Flexible time, remote/hybrid vài ngày/tuần",
  },
  {
    key: "cong_tac_phi",
    label: "Công tác phí",
    icon: "Receipt",
    hint: "VD: Chi phí đi lại, lưu trú khi công tác",
  },
  {
    key: "xe_dua_don",
    label: "Xe đưa đón",
    icon: "Bus",
    hint: "VD: Shuttle bus theo tuyến",
  },
  {
    key: "the_thao",
    label: "Thể thao & Giải trí",
    icon: "Dumbbell",
    hint: "VD: Gym, CLB thể thao, phòng game/thư giãn",
  },
  {
    key: "tham_nien",
    label: "Phụ cấp thâm niên",
    icon: "Award",
    hint: "VD: Thưởng thâm niên hằng năm",
  },
  {
    key: "moi_truong",
    label: "Môi trường sáng tạo",
    icon: "Sparkles",
    hint: "VD: Studio mở, không gian nghệ thuật, đồng nghiệp giỏi",
  },
] as const;

const CATALOG_BY_KEY = new Map(
  STUDIO_PHUC_LOI_CATALOG.map((item) => [item.key, item] as const),
);

export function isStudioPhucLoiKey(value: unknown): value is StudioPhucLoiKey {
  return typeof value === "string" && CATALOG_BY_KEY.has(value as StudioPhucLoiKey);
}

export function studioPhucLoiLabel(key: string): string {
  return CATALOG_BY_KEY.get(key as StudioPhucLoiKey)?.label ?? key;
}

const PHUC_LOI_NOTE_MAX = 160;

/**
 * Chuẩn hoá phúc lợi từ input tuỳ ý (client body hoặc jsonb DB) → mảng hợp lệ:
 * chỉ giữ key thuộc catalog, khử trùng lặp, giữ đúng thứ tự catalog, cắt note.
 */
export function normalizeStudioPhucLoi(raw: unknown): StudioJobPhucLoiItem[] {
  if (!Array.isArray(raw)) return [];

  const noteByKey = new Map<StudioPhucLoiKey, string | null>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const key = (entry as { key?: unknown }).key;
    if (!isStudioPhucLoiKey(key)) continue;
    if (noteByKey.has(key)) continue;
    const rawNote = (entry as { note?: unknown }).note;
    const note =
      typeof rawNote === "string" && rawNote.trim()
        ? rawNote.trim().slice(0, PHUC_LOI_NOTE_MAX)
        : null;
    noteByKey.set(key, note);
  }

  // Giữ theo thứ tự catalog để hiển thị nhất quán.
  return STUDIO_PHUC_LOI_CATALOG.filter((item) => noteByKey.has(item.key)).map(
    (item) => ({ key: item.key, note: noteByKey.get(item.key) ?? null }),
  );
}
