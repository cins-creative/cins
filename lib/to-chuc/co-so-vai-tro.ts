import { commentVaiTroLabel } from "@/lib/social/comments/vai-tro-label";

/** Vai trò staff trên trang cơ sở đào tạo. */
export type CoSoStaffVaiTro =
  | "owner"
  | "admin"
  | "quan_ly_noi_dung"
  | "quan_ly_tuyen_sinh"
  | "giao_vien"
  | "nhan_vien";

const CO_SO_STAFF_ROLE_SET = new Set<string>([
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
  "giao_vien",
  "nhan_vien",
]);

const CO_SO_STAFF_PRIORITY: CoSoStaffVaiTro[] = [
  "owner",
  "admin",
  "quan_ly_tuyen_sinh",
  "quan_ly_noi_dung",
  "giao_vien",
  "nhan_vien",
];

export const CO_SO_ASSIGNABLE_ROLES: CoSoStaffVaiTro[] = [
  "admin",
  "quan_ly_tuyen_sinh",
  "quan_ly_noi_dung",
  "giao_vien",
  "nhan_vien",
];

export function isCoSoStaffRole(role: string): role is CoSoStaffVaiTro {
  return CO_SO_STAFF_ROLE_SET.has(role);
}

export function pickCoSoStaffVaiTro(roles: string[]): CoSoStaffVaiTro | null {
  const staff = roles.filter(isCoSoStaffRole);
  for (const role of CO_SO_STAFF_PRIORITY) {
    if (staff.includes(role)) return role;
  }
  return null;
}

export function coSoVaiTroLabel(vaiTro: string): string {
  return commentVaiTroLabel(vaiTro);
}

export function coSoAssignableRoleLabel(vaiTro: CoSoStaffVaiTro): string {
  switch (vaiTro) {
    case "admin":
      return "Quản trị viên";
    case "quan_ly_tuyen_sinh":
      return "Quản lý tuyển sinh";
    case "quan_ly_noi_dung":
      return "Quản lý nội dung";
    case "giao_vien":
      return "Giảng viên";
    case "nhan_vien":
      return "Nhân viên";
    default:
      return coSoVaiTroLabel(vaiTro);
  }
}

/** Nhãn vai trò trên thẻ listing (không ▾). */
export function listingOrgStaffRoleLabel(
  vaiTro: CoSoStaffVaiTro | null | undefined,
): string | null {
  if (!vaiTro) return null;
  if (vaiTro === "owner") return "Chủ sở hữu";
  return coSoAssignableRoleLabel(vaiTro);
}

/** Listing «của tôi»: có vai trò staff hoặc đang theo dõi. */
export function isListingMineOrg(item: {
  viewerVaiTro?: string | null;
  viewerDangTheoDoi?: boolean | null;
}): boolean {
  return Boolean(item.viewerVaiTro || item.viewerDangTheoDoi);
}

/** Badge trên card: ưu tiên vai trò, không thì «Đang theo dõi». */
export function listingOrgRelationBadge(item: {
  viewerVaiTro?: CoSoStaffVaiTro | null;
  viewerDangTheoDoi?: boolean | null;
}): string | null {
  return (
    listingOrgStaffRoleLabel(item.viewerVaiTro) ??
    (item.viewerDangTheoDoi ? "Đang theo dõi" : null)
  );
}

export function canManageCoSoMembers(
  vaiTro: CoSoStaffVaiTro | null | undefined,
): boolean {
  return vaiTro === "owner" || vaiTro === "admin";
}

/** Tạo / quản lý khóa học trên tab Khóa học. */
export function canManageKhoaHoc(
  vaiTro: CoSoStaffVaiTro | null | undefined,
): boolean {
  return (
    vaiTro === "owner" ||
    vaiTro === "admin" ||
    vaiTro === "quan_ly_noi_dung"
  );
}

export function canChangeCoSoSlug(
  vaiTro: CoSoStaffVaiTro | null | undefined,
): boolean {
  return vaiTro === "owner" || vaiTro === "admin";
}
