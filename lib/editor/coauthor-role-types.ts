export type CoAuthorNgheRoleOption = {
  slug: string;
  tieuDe: string;
  roleShort: string;
  /** Tên tiếng Anh ngắn (nếu khác `roleShort`) — hiển thị phụ trong picker. */
  roleEng: string | null;
  linhVucTen: string | null;
  roleLabel: string;
};
