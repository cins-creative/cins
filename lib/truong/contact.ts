import {
  facebookDisplayLabel,
  formatChiNhanhAddress,
  normalizeFacebookUrl,
  resolvePrimaryChiNhanhDisplay,
  resolveTruongChiNhanh,
} from "@/lib/truong/chi-nhanh";
import type { TruongChiNhanh, TruongListItem } from "@/lib/truong/types";

/**
 * Mã enum `tinh_thanh_vn_enum` trên Supabase (CINS).
 * 34 đơn vị hành chính sau Nghị quyết 202/2025/QH15 (hiệu lực 1/7/2025).
 * TP.HCM = `hcm` (không phải `ho_chi_minh`).
 *
 * Thứ tự UI: HCM · Hà Nội · Đà Nẵng ghim đầu, còn lại A→Z theo tên Việt.
 */
export const TINH_THANH_ALLOWED = [
  "hcm",
  "ha_noi",
  "da_nang",
  "an_giang",
  "bac_ninh",
  "ca_mau",
  "can_tho",
  "cao_bang",
  "dak_lak",
  "dien_bien",
  "dong_nai",
  "dong_thap",
  "gia_lai",
  "ha_tinh",
  "hai_phong",
  "hung_yen",
  "hue",
  "khanh_hoa",
  "lai_chau",
  "lam_dong",
  "lang_son",
  "lao_cai",
  "nghe_an",
  "ninh_binh",
  "phu_tho",
  "quang_ngai",
  "quang_ninh",
  "quang_tri",
  "son_la",
  "tay_ninh",
  "thai_nguyen",
  "thanh_hoa",
  "tuyen_quang",
  "vinh_long",
] as const;

export type TinhThanhCode = (typeof TINH_THANH_ALLOWED)[number];

const TINH_THANH_LABELS: Record<TinhThanhCode, string> = {
  hcm: "TP. Hồ Chí Minh",
  ha_noi: "Hà Nội",
  da_nang: "Đà Nẵng",
  an_giang: "An Giang",
  bac_ninh: "Bắc Ninh",
  ca_mau: "Cà Mau",
  can_tho: "Cần Thơ",
  cao_bang: "Cao Bằng",
  dak_lak: "Đắk Lắk",
  dien_bien: "Điện Biên",
  dong_nai: "Đồng Nai",
  dong_thap: "Đồng Tháp",
  gia_lai: "Gia Lai",
  ha_tinh: "Hà Tĩnh",
  hai_phong: "Hải Phòng",
  hung_yen: "Hưng Yên",
  hue: "Huế",
  khanh_hoa: "Khánh Hòa",
  lai_chau: "Lai Châu",
  lam_dong: "Lâm Đồng",
  lang_son: "Lạng Sơn",
  lao_cai: "Lào Cai",
  nghe_an: "Nghệ An",
  ninh_binh: "Ninh Bình",
  phu_tho: "Phú Thọ",
  quang_ngai: "Quảng Ngãi",
  quang_ninh: "Quảng Ninh",
  quang_tri: "Quảng Trị",
  son_la: "Sơn La",
  tay_ninh: "Tây Ninh",
  thai_nguyen: "Thái Nguyên",
  thanh_hoa: "Thanh Hóa",
  tuyen_quang: "Tuyên Quang",
  vinh_long: "Vĩnh Long",
};

/** Alias / mã legacy (trước sáp nhập hoặc slug cũ) → mã enum DB hiện hành. */
const TINH_THANH_ALIASES: Record<string, TinhThanhCode> = {
  // HCM
  ho_chi_minh: "hcm",
  "tp.hcm": "hcm",
  tp_hcm: "hcm",
  tphcm: "hcm",
  "tp ho chi minh": "hcm",
  binh_duong: "hcm",
  binhduong: "hcm",
  ba_ria_vung_tau: "hcm",
  brvt: "hcm",
  vung_tau: "hcm",
  // Hà Nội / Đà Nẵng
  hn: "ha_noi",
  hanoi: "ha_noi",
  danang: "da_nang",
  dn: "da_nang",
  quang_nam: "da_nang",
  // Thành phố khác
  cantho: "can_tho",
  soc_trang: "can_tho",
  hau_giang: "can_tho",
  haiphong: "hai_phong",
  hai_duong: "hai_phong",
  // Tỉnh sau sáp nhập
  dongnai: "dong_nai",
  binh_phuoc: "dong_nai",
  ha_giang: "tuyen_quang",
  yen_bai: "lao_cai",
  bac_kan: "thai_nguyen",
  vinh_phuc: "phu_tho",
  hoa_binh: "phu_tho",
  bac_giang: "bac_ninh",
  thai_binh: "hung_yen",
  nam_dinh: "ninh_binh",
  ha_nam: "ninh_binh",
  quang_binh: "quang_tri",
  kon_tum: "quang_ngai",
  binh_dinh: "gia_lai",
  ninh_thuan: "khanh_hoa",
  dak_nong: "lam_dong",
  binh_thuan: "lam_dong",
  phu_yen: "dak_lak",
  long_an: "tay_ninh",
  ben_tre: "vinh_long",
  tra_vinh: "vinh_long",
  tien_giang: "dong_thap",
  bac_lieu: "ca_mau",
  kien_giang: "an_giang",
};

const PINNED_CODES: readonly TinhThanhCode[] = ["hcm", "ha_noi", "da_nang"];

function buildSelectOptions(): { value: string; label: string }[] {
  const pinned = PINNED_CODES.map((value) => ({
    value,
    label: TINH_THANH_LABELS[value],
  }));
  const rest = TINH_THANH_ALLOWED.filter(
    (code) => !PINNED_CODES.includes(code),
  )
    .map((value) => ({ value, label: TINH_THANH_LABELS[value] }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));
  return [...pinned, ...rest];
}

export const TINH_THANH_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— Chưa chọn —" },
  ...buildSelectOptions(),
];

/** Dropdown bắt buộc chọn khu vực (không có option rỗng). */
export const TINH_THANH_SELECT_OPTIONS = TINH_THANH_OPTIONS.filter(
  (o) => o.value !== "",
);

export const TINH_THANH_CODE_SET = new Set<string>(TINH_THANH_ALLOWED);

export function labelTinhThanh(code: string | null | undefined): string | null {
  const key = (code ?? "").trim().toLowerCase();
  if (!key) return null;
  const normalized = normalizeTinhThanhForDb(key);
  if (normalized && TINH_THANH_LABELS[normalized as TinhThanhCode]) {
    return TINH_THANH_LABELS[normalized as TinhThanhCode];
  }
  if (key in TINH_THANH_LABELS) {
    return TINH_THANH_LABELS[key as TinhThanhCode];
  }
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatSuKienDiaDiemDisplay(
  tinhThanh: string | null | undefined,
  diaDiem: string | null | undefined,
): string | null {
  const region = labelTinhThanh(tinhThanh);
  const detail = diaDiem?.trim();
  if (region && detail) return `${region} · ${detail}`;
  return region || detail || null;
}

/** Chuẩn hóa trước khi PATCH — tránh lỗi enum DB. */
export function normalizeTinhThanhForDb(value: unknown): string | null {
  if (value === "" || value === undefined || value === null) return null;
  const key = String(value).trim().toLowerCase();
  if (!key) return null;
  if ((TINH_THANH_ALLOWED as readonly string[]).includes(key)) {
    return key;
  }
  const alias = TINH_THANH_ALIASES[key];
  if (alias) return alias;
  return null;
}

export type TruongContactLine = {
  kind: "address" | "phone" | "email" | "web" | "facebook";
  label: string;
  value: string;
  href?: string;
};

/** Liên hệ một chi nhánh (sidebar chi nhánh chính). */
export function buildChiNhanhContactLines(
  branch: TruongChiNhanh,
): TruongContactLine[] {
  const lines: TruongContactLine[] = [];
  const address = formatChiNhanhAddress(branch);
  if (address) {
    lines.push({
      kind: "address",
      label: branch.ten?.trim() || "Địa chỉ",
      value: address,
    });
  }

  const phone = branch.dien_thoai?.trim();
  if (phone) {
    lines.push({
      kind: "phone",
      label: "Điện thoại",
      value: phone,
      href: `tel:${phone.replace(/\s+/g, "")}`,
    });
  }

  const email = branch.email?.trim();
  if (email) {
    lines.push({
      kind: "email",
      label: "Email",
      value: email,
      href: `mailto:${email}`,
    });
  }

  const web = branch.website?.trim();
  if (web) {
    const href = web.startsWith("http") ? web : `https://${web}`;
    const display = web.replace(/^https?:\/\//, "").replace(/\/$/, "");
    lines.push({
      kind: "web",
      label: "Website",
      value: display,
      href,
    });
  }

  const facebook = normalizeFacebookUrl(branch.facebook);
  if (facebook) {
    lines.push({
      kind: "facebook",
      label: "Facebook",
      value: facebookDisplayLabel(facebook),
      href: facebook,
    });
  }

  return lines;
}

export function buildTruongContactLines(
  school: Pick<
    TruongListItem,
    | "website"
    | "facebook"
    | "dia_chi"
    | "chi_nhanh"
    | "dien_thoai"
    | "email_lien_he"
    | "tinh_thanh"
  >,
  options?: { includeAddress?: boolean },
): TruongContactLine[] {
  const lines: TruongContactLine[] = [];
  const includeAddress = options?.includeAddress ?? true;

  if (includeAddress) {
    const addressParts: string[] = [];
    if (school.dia_chi?.trim()) addressParts.push(school.dia_chi.trim());
    const city = labelTinhThanh(school.tinh_thanh);
    if (city) addressParts.push(city);
    if (addressParts.length > 0) {
      lines.push({
        kind: "address",
        label: "Địa chỉ",
        value: addressParts.join(", "),
      });
    }
  }

  const phone = school.dien_thoai?.trim();
  if (phone) {
    const tel = phone.replace(/\s+/g, "");
    lines.push({
      kind: "phone",
      label: "Điện thoại",
      value: phone,
      href: `tel:${tel}`,
    });
  }

  const email = school.email_lien_he?.trim();
  if (email) {
    lines.push({
      kind: "email",
      label: "Email",
      value: email,
      href: `mailto:${email}`,
    });
  }

  const web = school.website?.trim();
  if (web) {
    const href = web.startsWith("http") ? web : `https://${web}`;
    const display = web.replace(/^https?:\/\//, "").replace(/\/$/, "");
    lines.push({
      kind: "web",
      label: "Website",
      value: display,
      href,
    });
  }

  const facebook = normalizeFacebookUrl(school.facebook);
  if (facebook) {
    lines.push({
      kind: "facebook",
      label: "Facebook",
      value: facebookDisplayLabel(facebook),
      href: facebook,
    });
  } else {
    const fromBranches = resolveSchoolFacebook(school);
    if (fromBranches) {
      lines.push({
        kind: "facebook",
        label: "Facebook",
        value: facebookDisplayLabel(fromBranches),
        href: fromBranches,
      });
    }
  }

  return lines;
}

/** Fanpage — ưu tiên chi nhánh chính, rồi `cau_hinh.facebook`, rồi chi nhánh khác. */
export function resolveSchoolFacebook(
  school: Pick<
    TruongListItem,
    "facebook" | "chi_nhanh" | "dia_chi" | "tinh_thanh" | "dien_thoai" | "email_lien_he" | "website"
  >,
): string | null {
  const primary = resolvePrimaryChiNhanhDisplay(school);
  const fromPrimary = normalizeFacebookUrl(primary?.facebook);
  if (fromPrimary) return fromPrimary;

  const fromOrg = normalizeFacebookUrl(school.facebook);
  if (fromOrg) return fromOrg;

  for (const branch of resolveTruongChiNhanh(school)) {
    const fromBranch = normalizeFacebookUrl(branch.facebook);
    if (fromBranch) return fromBranch;
  }

  return null;
}

/** Liên hệ sidebar trường — chi nhánh chính + fanpage nếu chưa có trong dòng. */
export function buildSchoolSidebarContactLines(
  school: Pick<
    TruongListItem,
    | "website"
    | "facebook"
    | "dia_chi"
    | "chi_nhanh"
    | "dien_thoai"
    | "email_lien_he"
    | "tinh_thanh"
  >,
): TruongContactLine[] {
  const primary = resolvePrimaryChiNhanhDisplay(school);
  const lines = primary ? buildChiNhanhContactLines(primary) : [];

  if (!lines.some((line) => line.kind === "facebook")) {
    const facebook = resolveSchoolFacebook(school);
    if (facebook) {
      lines.push({
        kind: "facebook",
        label: "Facebook",
        value: facebookDisplayLabel(facebook),
        href: facebook,
      });
    }
  }

  return lines;
}

export function hasTruongContactInfo(
  school: Parameters<typeof buildTruongContactLines>[0],
): boolean {
  return buildTruongContactLines(school).length > 0;
}
