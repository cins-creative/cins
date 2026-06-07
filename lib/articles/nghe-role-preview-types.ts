export type NgheRolePreview = {
  slug: string;
  tieuDe: string;
  /** Vị trí ngắn — khớp `vai_tro` người dùng nhập. */
  roleShort: string;
  /** Tên lĩnh vực (`linh_vuc.ten`) của bài nghề. */
  linhVucTen: string | null;
  /** Hiển thị: `{linhVucTen} - {roleShort}` hoặc chỉ `roleShort`. */
  roleLabel: string;
  tomTat: string | null;
  thumbUrl: string | null;
};
