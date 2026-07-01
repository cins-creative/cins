export type AdminOrgMember = {
  id: string;
  userId: string;
  slug: string;
  tenHienThi: string;
  avatarUrl: string | null;
  vaiTro: string;
  vaiTroLabel: string;
  trangThai: "active" | "pending";
};

export type AdminOrgMemberRoleOption = {
  value: string;
  label: string;
};

export type AdminOrgMembersPayload = {
  orgId: string;
  orgTen: string;
  orgSlug: string;
  loai: string;
  loaiLabel: string;
  assignableRoles: AdminOrgMemberRoleOption[];
  members: AdminOrgMember[];
};
