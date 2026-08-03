/**
 * Trang chủ adaptive — map `giai_doan` → persona + bộ module (brief §5/§6).
 *
 * Bất biến: feed giữa KHÔNG phụ thuộc persona. Chỉ 2 cột module hoán theo nhóm.
 * `tim_viec` không phải persona riêng — là modifier `seeking` chồng lên cụm LÀM (§7).
 */

/** Enum `giai_doan_enum` (DB: `user_nguoi_dung.giai_doan` — đọc trực tiếp). */
export type GiaiDoan =
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
  | "scout_tai_nang"
  // Phase 4 — mua bán
  | "don_can_xu_ly"
  | "don_mua_cua_toi"
  | "quay_cua_toi"
  // Phase 4 — tổ chức / vận hành
  | "org_inbox"
  | "quan_ly_su_kien"
  | "ung_vien_moi"
  | "to_chuc_cua_ban"
  // Phase 4 — kết nối
  | "ung_tuyen_cua_toi"
  | "tin_nhan_ban_be"
  | "tin_nhan_to_chuc"
  | "tin_nhan_mua_ban"
  | "loi_moi_ket_ban"
  | "se_tham_gia"
  | "da_luu"
  | "hang_feature";

/**
 * Đọc `giai_doan` tĩnh → persona. MVP đọc nhãn tự khai (FOUNDATIONS luồng 1,
 * độ tin "Thấp"). Tách riêng để sau nâng thành behavior-blended mà không đụng layout.
 */
export function resolvePersona(giaiDoan: GiaiDoan | null | undefined): Persona {
  switch (giaiDoan) {
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
 * Nội dung dạng "cơ hội & thông báo" — org theo dõi, sự kiện, tuyển dụng.
 * Luôn nằm ở **cột phải** cho mọi persona; các module còn lại (gồm khóa học gợi ý)
 * dồn sang **cột trái**. Đổi phân loại 1 module = thêm/bớt id ở đây (không cần `if persona`).
 */
/** Module luôn nằm cột phải (cơ hội & thông báo). */
export const NOTIFY_MODULES: readonly ModuleId[] = [
  "theo_doi_org",
  "co_hoi",
  "quan_ly_su_kien",
  "tin_nhan_ban_be",
  "tin_nhan_to_chuc",
  "tin_nhan_mua_ban",
  "loi_moi_ket_ban",
];

/**
 * Thứ tự mặc định theo `giai_doan` — tối đa 3 khối cho user mới.
 * Custom thêm qua «Thêm khối»; không nhồi catalog capability vào đây.
 */
export const MODULE_ORDER_BY_GIAI_DOAN: Record<GiaiDoan, ModuleId[]> = {
  dang_hoc: ["kham_pha_linh_vuc", "khoa_hoc_goi_y", "theo_doi_org"],
  freelance: ["ho_so_cua_ban", "co_hoi", "goi_y_studio"],
  dang_lam: ["nguoi_cung_nganh", "goi_y_studio", "theo_doi_org"],
  tim_viec: ["ho_so_cua_ban", "co_hoi", "theo_doi_org"],
  dang_day: ["theo_doi_org"],
};

/**
 * Fallback theo persona (khi chưa có `giai_doan`) — cũng ≤3.
 * `tim_viec`/`freelance` ưu tiên `MODULE_ORDER_BY_GIAI_DOAN`.
 */
export const MODULE_ORDER: Record<Persona, ModuleId[]> = {
  hoc: [...MODULE_ORDER_BY_GIAI_DOAN.dang_hoc],
  lam: [...MODULE_ORDER_BY_GIAI_DOAN.dang_lam],
  day: [...MODULE_ORDER_BY_GIAI_DOAN.dang_day],
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

/** Default columns theo giai đoạn (user mới / reset layout). */
export function defaultModuleLayoutForGiaiDoan(
  giaiDoan: GiaiDoan | null | undefined,
): { left: ModuleId[]; right: ModuleId[] } {
  if (giaiDoan && giaiDoan in MODULE_ORDER_BY_GIAI_DOAN) {
    return splitColumns([...MODULE_ORDER_BY_GIAI_DOAN[giaiDoan]]);
  }
  return splitColumns([...MODULE_ORDER[resolvePersona(giaiDoan)]]);
}

/** Thứ tự inject «Mới» khi đổi giai đoạn — cùng nguồn với default. */
export function moduleOrderForGiaiDoan(
  giaiDoan: GiaiDoan | null | undefined,
  persona: Persona = resolvePersona(giaiDoan),
): ModuleId[] {
  if (giaiDoan && giaiDoan in MODULE_ORDER_BY_GIAI_DOAN) {
    return [...MODULE_ORDER_BY_GIAI_DOAN[giaiDoan]];
  }
  return [...MODULE_ORDER[persona]];
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
