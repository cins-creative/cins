import type { HomeCapability } from "@/lib/cins/home-adaptive/capability-types";
import type { ModuleId, Persona } from "@/lib/cins/home-adaptive/persona";
import { NOTIFY_MODULES } from "@/lib/cins/home-adaptive/persona";

export type ModuleSide = "left" | "right";

export type ModuleMeta = {
  id: ModuleId;
  label: string;
  description: string;
  /** Cột gợi ý khi thêm mới (không bắt buộc — user kéo được). */
  defaultSide: ModuleSide;
  /** Persona mặc định có module này trong layout. */
  defaultPersonas: readonly Persona[];
  /** false → không cho đưa vào `hidden` (vd. chờ duyệt). */
  hideable: boolean;
  /**
   * Nhóm catalog «Thêm khối» theo đối tượng dùng
   * (Đang học · Freelance · Đang làm · Đang dạy · Shop · Chung).
   */
  group:
    | "dang_hoc"
    | "freelance"
    | "dang_lam"
    | "dang_day"
    | "shop"
    | "chung";
  /** AND — thiếu 1 capability → ẩn khỏi catalog. */
  requires?: readonly HomeCapability[];
  /** OR — cần ≥1 trong list (kết hợp với requires nếu có). */
  requiresAny?: readonly HomeCapability[];
};

const NOTIFY_SET = new Set<ModuleId>(NOTIFY_MODULES);

export function defaultSideForModule(id: ModuleId): ModuleSide {
  return NOTIFY_SET.has(id) ? "right" : "left";
}

/**
 * Catalog Phase 1+4: nhóm A/B + E (vai trò vận hành).
 * Nguồn duy nhất cho panel «Thêm khối» + nhãn edit chrome.
 */
export const MODULE_META: Record<ModuleId, ModuleMeta> = {
  theo_doi_org: {
    id: "theo_doi_org",
    label: "Sự kiện",
    description: "Tất cả sự kiện sắp tới và sự kiện bạn quan tâm / quầy.",
    defaultSide: "right",
    defaultPersonas: ["hoc", "lam", "day"],
    hideable: true,
    group: "chung",
  },
  goi_y_theo_doi: {
    id: "goi_y_theo_doi",
    label: "Gợi ý theo dõi",
    description: "Người dùng gợi ý để theo dõi.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "chung",
  },
  goi_y_studio: {
    id: "goi_y_studio",
    label: "Studio đang tuyển dụng",
    description: "Studio / DN có tin tuyển dụng đang mở.",
    defaultSide: "left",
    defaultPersonas: ["lam"],
    hideable: true,
    group: "freelance",
  },
  kham_pha_linh_vuc: {
    id: "kham_pha_linh_vuc",
    label: "Khám phá lĩnh vực",
    description: "Lĩnh vực ngành sáng tạo để khám phá.",
    defaultSide: "left",
    defaultPersonas: ["hoc"],
    hideable: true,
    group: "dang_hoc",
  },
  duong_toi_do: {
    id: "duong_toi_do",
    label: "Cơ sở đào tạo",
    description: "Cơ sở đào tạo gợi ý theo dõi.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "dang_hoc",
  },
  khoa_hoc_goi_y: {
    id: "khoa_hoc_goi_y",
    label: "Khóa học gợi ý",
    description: "Khóa đang mở tuyển từ cơ sở đào tạo.",
    defaultSide: "left",
    defaultPersonas: ["hoc"],
    hideable: true,
    group: "dang_hoc",
  },
  lop_hoc_cua_ban: {
    id: "lop_hoc_cua_ban",
    label: "Phòng học",
    description:
      "Lớp đang học / đang dạy — gần giờ bấm một cái vào phòng chat.",
    defaultSide: "right",
    defaultPersonas: ["hoc"],
    hideable: true,
    group: "dang_hoc",
    requiresAny: ["dang_hoc_khoa", "org_staff"],
  },
  ho_so_cua_ban: {
    id: "ho_so_cua_ban",
    label: "Hồ sơ của bạn",
    description: "Mức hoàn thiện hồ sơ và gợi ý cập nhật.",
    defaultSide: "left",
    defaultPersonas: ["lam"],
    hideable: true,
    group: "freelance",
  },
  nguoi_cung_nganh: {
    id: "nguoi_cung_nganh",
    label: "Người cùng ngành",
    description: "Gợi ý kết nối người cùng lĩnh vực.",
    defaultSide: "left",
    defaultPersonas: ["lam"],
    hideable: true,
    group: "dang_lam",
  },
  co_hoi: {
    id: "co_hoi",
    label: "Cơ hội cho bạn",
    description: "Tin tuyển dụng phù hợp giai đoạn của bạn.",
    defaultSide: "right",
    defaultPersonas: ["lam"],
    hideable: true,
    group: "freelance",
  },
  cho_ban_duyet: {
    id: "cho_ban_duyet",
    label: "Chờ bạn duyệt",
    description: "Yêu cầu xác thực đang chờ bạn xử lý.",
    defaultSide: "left",
    defaultPersonas: ["day"],
    hideable: true,
    group: "dang_day",
    requires: ["org_staff"],
  },
  hoc_vien_cua_ban: {
    id: "hoc_vien_cua_ban",
    label: "Học viên của bạn",
    description: "Học viên trong các lớp bạn quản lý.",
    defaultSide: "left",
    defaultPersonas: ["day"],
    hideable: true,
    group: "dang_day",
    requires: ["org_staff"],
  },
  scout_tai_nang: {
    id: "scout_tai_nang",
    label: "Scout tài năng",
    description: "Học viên nổi bật theo cột mốc.",
    defaultSide: "left",
    defaultPersonas: ["day"],
    hideable: true,
    group: "dang_day",
    requires: ["org_staff"],
  },

  // —— Shop ——
  don_can_xu_ly: {
    id: "don_can_xu_ly",
    label: "Đơn chờ xử lý",
    description: "Đơn hàng cần bạn xác nhận hoặc giao.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "shop",
    requires: ["co_shop"],
  },
  don_mua_cua_toi: {
    id: "don_mua_cua_toi",
    label: "Đơn tôi đặt",
    description: "Theo dõi đơn hàng bạn đã mua.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "shop",
    requires: ["da_mua_hang"],
  },
  quay_cua_toi: {
    id: "quay_cua_toi",
    label: "Quầy sự kiện của tôi",
    description: "Đã gộp vào khối Sự kiện → tab Quan tâm.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "shop",
    requires: ["co_shop"],
  },
  quan_ly_kho: {
    id: "quan_ly_kho",
    label: "Quản lý kho hàng",
    description: "Tồn kho thấp / hết hàng — vào sửa số lượng.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "shop",
    requires: ["co_shop"],
  },
  gio_hang_cua_ban: {
    id: "gio_hang_cua_ban",
    label: "Giỏ hàng của bạn",
    description: "Hàng đang để trong giỏ chờ mua.",
    defaultSide: "right",
    defaultPersonas: [],
    hideable: true,
    group: "shop",
  },

  // —— Đang làm / tổ chức ——
  org_inbox: {
    id: "org_inbox",
    label: "Hộp thư tổ chức",
    description: "Tin nhắn học viên / khách tới tổ chức bạn quản lý.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "dang_day",
    requires: ["org_staff"],
  },
  quan_ly_su_kien: {
    id: "quan_ly_su_kien",
    label: "Quản lý sự kiện",
    description: "Số người tham gia và quầy shop chờ duyệt.",
    defaultSide: "right",
    defaultPersonas: [],
    hideable: true,
    group: "dang_lam",
    requires: ["su_kien_admin"],
  },
  ung_vien_moi: {
    id: "ung_vien_moi",
    label: "Ứng viên mới",
    description: "Ứng viên vừa nộp vào tin tuyển dụng của bạn.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "dang_lam",
    requires: ["studio_tuyen_dung"],
  },
  to_chuc_cua_ban: {
    id: "to_chuc_cua_ban",
    label: "Tổ chức của bạn",
    description: "Các tổ chức bạn đang là thành viên.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "dang_lam",
    requires: ["org_thanh_vien"],
  },

  // —— Kết nối / chung ——
  ung_tuyen_cua_toi: {
    id: "ung_tuyen_cua_toi",
    label: "Ứng tuyển của tôi",
    description: "Hồ sơ bạn đã nộp — theo dõi trạng thái.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "freelance",
    requires: ["da_ung_tuyen"],
  },
  tin_nhan_ban_be: {
    id: "tin_nhan_ban_be",
    label: "Tin nhắn bạn bè",
    description: "Hội thoại gần đây với bạn bè.",
    defaultSide: "right",
    defaultPersonas: [],
    hideable: true,
    group: "chung",
  },
  tin_nhan_to_chuc: {
    id: "tin_nhan_to_chuc",
    label: "Tin nhắn tổ chức",
    description: "Nhóm lớp / tổ chức để vào học nhanh.",
    defaultSide: "right",
    defaultPersonas: [],
    hideable: true,
    group: "dang_hoc",
    requiresAny: ["dang_hoc_khoa", "org_thanh_vien"],
  },
  tin_nhan_mua_ban: {
    id: "tin_nhan_mua_ban",
    label: "Tin nhắn mua bán",
    description: "Chat với người mua hoặc người bán.",
    defaultSide: "right",
    defaultPersonas: [],
    hideable: true,
    group: "shop",
    requiresAny: ["co_shop", "da_mua_hang"],
  },
  loi_moi_ket_ban: {
    id: "loi_moi_ket_ban",
    label: "Lời mời kết bạn",
    description: "Người đang chờ bạn chấp nhận kết bạn.",
    defaultSide: "right",
    defaultPersonas: [],
    hideable: true,
    group: "chung",
  },
  se_tham_gia: {
    id: "se_tham_gia",
    label: "Sẽ tham gia",
    description: "Sự kiện bạn đã xác nhận tham dự.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "chung",
  },
  da_luu: {
    id: "da_luu",
    label: "Đã lưu",
    description: "Nội dung bạn đã đánh dấu lưu.",
    defaultSide: "left",
    defaultPersonas: [],
    hideable: true,
    group: "chung",
  },
  hang_feature: {
    id: "hang_feature",
    label: "Hàng feature",
    description:
      "Sản phẩm nổi bật từ shop bạn bè — đổi dần, bấm vào trang loại hàng.",
    defaultSide: "right",
    defaultPersonas: [],
    hideable: true,
    group: "chung",
  },
};

export const ALL_MODULE_IDS: readonly ModuleId[] = Object.keys(
  MODULE_META,
) as ModuleId[];

export const MODULE_GROUP_LABEL: Record<ModuleMeta["group"], string> = {
  dang_hoc: "Đang học",
  freelance: "Freelance",
  dang_lam: "Đang làm",
  dang_day: "Đang dạy",
  shop: "Shop",
  chung: "Dành cho mọi người",
};

/** Thứ tự nhóm catalog — ưu tiên đối tượng khớp persona đang xem. */
export function moduleGroupOrderForPersona(
  persona: Persona,
): readonly ModuleMeta["group"][] {
  switch (persona) {
    case "hoc":
      return ["dang_hoc", "chung", "freelance", "dang_lam", "dang_day", "shop"];
    case "day":
      return ["dang_day", "chung", "dang_hoc", "dang_lam", "freelance", "shop"];
    case "lam":
    default:
      return ["freelance", "dang_lam", "chung", "dang_hoc", "dang_day", "shop"];
  }
}

/** Module không được đưa vào `hidden`. */
export const NON_HIDEABLE_MODULES: ReadonlySet<ModuleId> = new Set(
  ALL_MODULE_IDS.filter((id) => !MODULE_META[id].hideable),
);

/**
 * Module gắn capability — chỉ inject tối thiểu khi layout mặc định / chưa ẩn.
 * Phần còn lại user tự thêm trong «Thêm khối» (tránh sidebar nhồi đầy user mới).
 */
export const CAPABILITY_DEFAULT_MODULES: readonly {
  id: ModuleId;
  requires?: readonly HomeCapability[];
  requiresAny?: readonly HomeCapability[];
}[] = [
  /** Org staff — inject mặc định khi có quyền; user có thể ẩn. */
  { id: "cho_ban_duyet", requires: ["org_staff"] },
  /** Seller có đơn chờ — tín hiệu vận hành quan trọng. */
  { id: "don_can_xu_ly", requires: ["co_shop"] },
];
