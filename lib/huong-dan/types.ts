/** Phiên hướng dẫn (public). */
export type HuongDanPhienPublic = {
  id: string;
  slug: string;
  tieuDe: string;
  videoUrl: string | null;
  noiDungHtml: string;
  thuTu: number;
};

/** Nhóm đối tượng + các phiên đã xuất bản. */
export type HuongDanNhomPublic = {
  slug: string;
  ten: string;
  thuTu: number;
  phien: HuongDanPhienPublic[];
};

export type HuongDanCatalogPublic = {
  nhom: HuongDanNhomPublic[];
};

/** Phiên đầy đủ cho admin (kể cả nháp / đã xoá mềm). */
export type HuongDanPhienAdmin = HuongDanPhienPublic & {
  nhomSlug: string;
  nhomTen: string;
  nhomThuTu: number;
  daXuatBan: boolean;
  daXoa: boolean;
  taoLuc: string;
  suaLuc: string;
};

export type HuongDanNhomAdmin = {
  slug: string;
  ten: string;
  thuTu: number;
  phien: HuongDanPhienAdmin[];
};

export type SaveHuongDanPhienInput = {
  id?: string;
  nhomSlug: string;
  nhomTen: string;
  nhomThuTu: number;
  slug: string;
  tieuDe: string;
  videoUrl?: string | null;
  noiDungHtml?: string;
  thuTu?: number;
  daXuatBan?: boolean;
};

export type CreateHuongDanNhomInput = {
  nhomSlug: string;
  nhomTen: string;
  nhomThuTu?: number;
};
