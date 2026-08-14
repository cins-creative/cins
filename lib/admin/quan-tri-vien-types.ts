export type AdminStaffRole = "super_admin" | "admin" | "curator";

export type AdminStaffRow = {
  id: string;
  slug: string;
  tenHienThi: string;
  email: string | null;
  avatarUrl: string | null;
  role: AdminStaffRole;
  roleLabel: string;
  /** Key tab bị ẩn (`bai-viet`, `nguoi-dung`, …). */
  tabAn: string[];
  canEditTabs: boolean;
};

export type AdminNavTabDto = {
  key: string;
  href: string;
  label: string;
  section: string;
};

export type AdminStaffListResponse = {
  rows: AdminStaffRow[];
  total: number;
  actorRole: AdminStaffRole | "thanh_vien";
  tabs: AdminNavTabDto[];
};
