/** Vai trò nhóm chat bạn bè — client + server an toàn. */

export type ChatGroupVaiTro = "owner" | "admin" | "thanh_vien";

const ROLE_RANK: Record<ChatGroupVaiTro, number> = {
  owner: 0,
  admin: 1,
  thanh_vien: 2,
};

export function normalizeGroupVaiTro(raw: string | null | undefined): ChatGroupVaiTro {
  if (raw === "owner") return "owner";
  if (raw === "admin") return "admin";
  return "thanh_vien";
}

export function groupRoleLabel(vaiTro: ChatGroupVaiTro): string {
  switch (vaiTro) {
    case "owner":
      return "Chủ nhóm";
    case "admin":
      return "Admin";
    default:
      return "Thành viên";
  }
}

/** Đổi tên, avatar, mời, thêm/kick thành viên thường, duyệt xin vào. */
export function canManageGroupChat(
  vaiTro: ChatGroupVaiTro | null | undefined,
): boolean {
  return vaiTro === "owner" || vaiTro === "admin";
}

/** Thăng/hạ admin, kick admin, xóa nhóm. */
export function canManageGroupRoles(
  vaiTro: ChatGroupVaiTro | null | undefined,
): boolean {
  return vaiTro === "owner";
}

export function canDeleteGroupChat(
  vaiTro: ChatGroupVaiTro | null | undefined,
): boolean {
  return vaiTro === "owner";
}

/** Admin chỉ kick thành viên; owner kick được admin + thành viên. */
export function canKickGroupMember(
  actor: ChatGroupVaiTro,
  target: ChatGroupVaiTro,
): boolean {
  if (target === "owner") return false;
  if (actor === "owner") return target === "admin" || target === "thanh_vien";
  if (actor === "admin") return target === "thanh_vien";
  return false;
}

export function compareGroupVaiTro(
  a: ChatGroupVaiTro,
  b: ChatGroupVaiTro,
): number {
  return ROLE_RANK[a] - ROLE_RANK[b];
}
