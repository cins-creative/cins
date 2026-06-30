/** Vai trò hợp lệ trong cộng đồng (`user_thanh_vien_to_chuc`). */
export type CongDongVaiTro =
  | "owner"
  | "admin"
  | "quan_ly_noi_dung"
  | "thanh_vien";

/** Raw enum từ DB — có thể gồm vai trò trường/đào tạo. */
export type VaiTroToChucRaw = CongDongVaiTro | string;

const COMMUNITY_ROLE_SET = new Set<CongDongVaiTro>([
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "thanh_vien",
]);

const COMMUNITY_ROLE_PRIORITY: CongDongVaiTro[] = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "thanh_vien",
];

export function isCongDongCommunityRole(
  role: string,
): role is CongDongVaiTro {
  return COMMUNITY_ROLE_SET.has(role as CongDongVaiTro);
}

/** Chọn vai trò cộng đồng cao nhất; bỏ vai trò trường/đào tạo/doanh nghiệp. */
export function pickCommunityVaiTro(
  roles: string[],
): CongDongVaiTro | null {
  const community = roles.filter(isCongDongCommunityRole);
  for (const role of COMMUNITY_ROLE_PRIORITY) {
    if (community.includes(role)) return role;
  }
  return null;
}

/** Nhãn nút sidebar (có ▾ khi đã tham gia). */
export function roleButtonLabel(
  vaiTro: CongDongVaiTro | null | undefined,
): string {
  if (!vaiTro) return "Tham gia cộng đồng";
  switch (vaiTro) {
    case "thanh_vien":
      return "Bạn là thành viên ▾";
    case "quan_ly_noi_dung":
      return "Bạn là Quản trị viên ▾";
    case "admin":
      return "Bạn là Admin ▾";
    case "owner":
      return "Bạn là Chủ sở hữu ▾";
    default:
      return "Bạn là thành viên ▾";
  }
}

/** Badge tĩnh cạnh tên tác giả trong feed (không ▾). */
export function authorRoleBadgeLabel(
  vaiTro: CongDongVaiTro | null | undefined,
): string | null {
  if (!vaiTro || vaiTro === "owner") return null;
  switch (vaiTro) {
    case "admin":
      return "Admin";
    case "quan_ly_noi_dung":
      return "Quản trị viên";
    case "thanh_vien":
      return "Thành viên";
    default:
      return null;
  }
}

export function canLeaveCommunity(
  vaiTro: CongDongVaiTro | null | undefined,
): boolean {
  return vaiTro === "thanh_vien";
}

export function canManageCommunityContent(
  vaiTro: CongDongVaiTro | null | undefined,
): boolean {
  return vaiTro === "quan_ly_noi_dung" || vaiTro === "admin";
}

export function canManageCommunity(
  vaiTro: CongDongVaiTro | null | undefined,
): boolean {
  return vaiTro === "owner" || vaiTro === "admin";
}

export function canManageLabels(
  vaiTro: CongDongVaiTro | null | undefined,
): boolean {
  return canManageCommunityContent(vaiTro) || canManageCommunity(vaiTro);
}

/** Admin cộng đồng — thêm thành viên & gán quyền. */
export function canManageMembers(
  vaiTro: CongDongVaiTro | null | undefined,
): boolean {
  return canManageCommunity(vaiTro);
}

export const CONG_DONG_ASSIGNABLE_ROLES: CongDongVaiTro[] = [
  "thanh_vien",
  "quan_ly_noi_dung",
  "admin",
];

export function assignableRoleLabel(vaiTro: CongDongVaiTro): string {
  switch (vaiTro) {
    case "thanh_vien":
      return "Thành viên";
    case "quan_ly_noi_dung":
      return "Quản trị nội dung";
    case "admin":
      return "Admin";
    default:
      return vaiTro;
  }
}

/** Quyền trong nhóm — dùng UI gán vai trò. */
export function assignableRolePermissions(
  vaiTro: CongDongVaiTro,
): readonly string[] {
  switch (vaiTro) {
    case "thanh_vien":
      return [
        "Đăng bài và tương tác trong feed nhóm",
        "Chọn nhãn khi đăng bài",
        "Tùy chỉnh thông báo",
        "Rời nhóm",
      ];
    case "quan_ly_noi_dung":
      return [
        "Mọi quyền thành viên (không rời nhóm)",
        "Quản lý nhãn bài đăng",
        "Chỉnh banner sự kiện",
        "Chủ đề nhóm — nghề/ngành liên quan",
      ];
    case "admin":
      return [
        "Mọi quyền quản trị nội dung",
        "Thêm thành viên và gán quyền",
      ];
    default:
      return [];
  }
}

export function assignableRolePermissionSummary(vaiTro: CongDongVaiTro): string {
  return assignableRolePermissions(vaiTro).join(" · ");
}

/** @deprecated Dùng `roleButtonLabel`. */
export function membershipButtonLabel(
  vaiTro: CongDongVaiTro | null | undefined,
): string {
  return roleButtonLabel(vaiTro);
}
