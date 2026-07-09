/**
 * Trang chủ adaptive — map `giai_doan` → persona + bộ module (brief §5/§6).
 *
 * Bất biến: feed giữa KHÔNG phụ thuộc persona. Chỉ 2 cột module hoán theo nhóm.
 * `tim_viec` không phải persona riêng — là modifier `seeking` chồng lên cụm LÀM (§7).
 */

/** Enum `giai_doan_enum` (DB: `user_nguoi_dung.giai_doan` — đọc trực tiếp). */
export type GiaiDoan =
  | "moi_bat_dau"
  | "dang_hoc"
  | "dang_lam"
  | "tim_viec"
  | "freelance"
  | "dang_day";

/** 3 cụm module. `tim_viec`/`freelance` ghép vào cụm sẵn, không có cụm riêng. */
export type Persona = "hoc" | "lam" | "day";

/** Id module — mỗi id tương ứng 1 component tự lo data + empty-state. */
export type ModuleId =
  // ưu tiên — chỉ hiện khi viewer theo dõi org
  | "theo_doi_org"
  // luôn có ở mọi persona
  | "goi_y_theo_doi"
  | "goi_y_studio"
  // cụm HỌC
  | "kham_pha_linh_vuc"
  | "duong_toi_do"
  | "khoa_hoc_goi_y"
  // cụm LÀM
  | "ho_so_cua_ban"
  | "nguoi_cung_nganh"
  | "co_hoi"
  // cụm DẠY
  | "cho_ban_duyet"
  | "hoc_vien_cua_ban"
  | "scout_tai_nang";

/**
 * Đọc `giai_doan` tĩnh → persona. MVP đọc nhãn tự khai (FOUNDATIONS luồng 1,
 * độ tin "Thấp"). Tách riêng để sau nâng thành behavior-blended mà không đụng layout.
 */
export function resolvePersona(giaiDoan: GiaiDoan | null | undefined): Persona {
  switch (giaiDoan) {
    case "moi_bat_dau":
    case "dang_hoc":
      return "hoc";
    case "dang_day":
      return "day";
    case "dang_lam":
    case "tim_viec":
    case "freelance":
      return "lam";
    default:
      // chưa khai (đã redirect onboarding ở tầng trên) → mặc định an toàn nhất
      return "hoc";
  }
}

/**
 * Modifier open-to-work (§7). MVP: suy từ `giai_doan='tim_viec'` (không thêm cột DB).
 * `seeking` chỉ đổi cột phải cụm LÀM + visibility — KHÔNG đổi feed giữa.
 */
export function resolveSeeking(giaiDoan: GiaiDoan | null | undefined): boolean {
  return giaiDoan === "tim_viec";
}

/**
 * Nội dung dạng "cơ hội & thông báo" — org theo dõi, sự kiện, tuyển dụng, khóa học.
 * Luôn nằm ở **cột phải** cho mọi persona; các module còn lại dồn sang **cột trái**.
 * Đổi phân loại 1 module = thêm/bớt id ở đây (không cần `if persona`).
 */
const NOTIFY_MODULES: readonly ModuleId[] = [
  "theo_doi_org",
  "co_hoi",
  "khoa_hoc_goi_y",
];

/**
 * Thứ tự tổng các module theo persona (brief §6). Hệ thống tự tách 2 cột:
 * cột phải = các id thuộc NOTIFY_MODULES, cột trái = phần còn lại — giữ nguyên
 * thứ tự khai báo. Thêm/đổi nhóm sau này = sửa list này, KHÔNG `if persona` rải JSX.
 */
const MODULE_ORDER: Record<Persona, ModuleId[]> = {
  hoc: [
    "kham_pha_linh_vuc",
    "theo_doi_org",
    "khoa_hoc_goi_y",
  ],
  lam: [
    "ho_so_cua_ban",
    "nguoi_cung_nganh",
    "goi_y_studio",
    "theo_doi_org",
    "co_hoi",
  ],
  day: [
    "cho_ban_duyet",
    "hoc_vien_cua_ban",
    "scout_tai_nang",
    "theo_doi_org",
  ],
};

const NOTIFY_SET = new Set<ModuleId>(NOTIFY_MODULES);

function splitColumns(order: ModuleId[]): { left: ModuleId[]; right: ModuleId[] } {
  const left: ModuleId[] = [];
  const right: ModuleId[] = [];
  for (const id of order) {
    if (NOTIFY_SET.has(id)) right.push(id);
    else left.push(id);
  }
  return { left, right };
}

/** Cột trái/phải mỗi persona — dẫn xuất từ MODULE_ORDER + NOTIFY_MODULES. */
export const MODULE_LAYOUT: Record<
  Persona,
  { left: ModuleId[]; right: ModuleId[] }
> = {
  hoc: splitColumns(MODULE_ORDER.hoc),
  lam: splitColumns(MODULE_ORDER.lam),
  day: splitColumns(MODULE_ORDER.day),
};

/** Lọc Sự kiện + Gợi ý theo dõi "theo cụm" (brief §5). */
export const SU_KIEN_LOAI_BY_PERSONA: Record<Persona, string[]> = {
  // HỌC: open day, thi thử, tour trường
  hoc: ["open_day", "tour_truong", "screening", "contest"],
  // LÀM: workshop, talkshow nghề
  lam: ["workshop", "talkshow", "meetup", "career_fair", "hackathon"],
  // DẠY: tuyển/scout
  day: ["career_fair", "trien_lam", "talkshow"],
};
