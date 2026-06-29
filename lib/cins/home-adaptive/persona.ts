/**
 * Trang chủ adaptive — map `giai_doan` → persona + bộ module (brief §5/§6).
 *
 * Bất biến: feed giữa KHÔNG phụ thuộc persona. Chỉ 2 cột module hoán theo nhóm.
 * `tim_viec` không phải persona riêng — là modifier `seeking` chồng lên cụm LÀM (§7).
 */

/** Enum `giai_doan_enum` (CINS_SCHEMA.md — user_nguoi_dung.giai_doan). */
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
  // luôn có ở mọi persona
  | "su_kien"
  | "goi_y_theo_doi"
  // cụm HỌC
  | "kham_pha_linh_vuc"
  | "duong_toi_do"
  | "khoa_hoc_goi_y"
  // cụm LÀM
  | "ho_so_cua_ban"
  | "nguoi_cung_nganh"
  | "co_hoi"
  | "loi_moi_xac_nhan"
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
 * Khai báo module nào ở cột nào theo persona (brief §6).
 * Thêm/đổi nhóm sau này = sửa map này, KHÔNG `if persona` rải trong JSX.
 */
export const MODULE_LAYOUT: Record<
  Persona,
  { left: ModuleId[]; right: ModuleId[] }
> = {
  hoc: {
    left: ["kham_pha_linh_vuc", "duong_toi_do"],
    right: ["su_kien", "goi_y_theo_doi", "khoa_hoc_goi_y"],
  },
  lam: {
    left: ["ho_so_cua_ban", "nguoi_cung_nganh"],
    right: ["su_kien", "goi_y_theo_doi", "co_hoi", "loi_moi_xac_nhan"],
  },
  day: {
    left: ["cho_ban_duyet", "hoc_vien_cua_ban"],
    right: ["su_kien", "goi_y_theo_doi", "scout_tai_nang"],
  },
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
