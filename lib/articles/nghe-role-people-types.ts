export type NgheRolePerson = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarUrl: string | null;
  /** Vị trí khớp nghề này (để hiển thị như author-row). */
  roles: string[];
};
