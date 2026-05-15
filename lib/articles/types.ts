export type LoaiBaiViet =
  | "linh_vuc"
  | "nghe"
  | "keyword"
  | "phan_mem"
  | "mon_hoc"
  | "blog"
  | "event"
  | "nganh_dao_tao";

export type TrangThaiNoidung =
  | "cho_review"
  | "dang_viet"
  | "published"
  | "archived"
  | "merged";

export type MetaPhanMem = {
  nha_phat_hanh: string;
  version: string;
  platform: string[];
  website?: string;
};

export type MetaNganhDaoTao = {
  ma_nganh: string;
  khoi_thi: string[];
};

export type ArticleMeta = MetaPhanMem | MetaNganhDaoTao | null;

export interface ArticleBaiViet {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_eng?: string | null;
  loai_bai_viet: LoaiBaiViet;
  tom_tat?: string | null;
  cover_id?: string | null;
  noi_dung?: string | null;
  /** Một số schema dùng `noi_dung_markdown` thay cho `noi_dung` */
  noi_dung_markdown?: string | null;
  meta: ArticleMeta;
  trang_thai_noi_dung: TrangThaiNoidung;
  merged_vao_id?: string | null;
  luot_xem: number;
  meta_title?: string | null;
  meta_description?: string | null;
  tao_luc: string;
  cap_nhat_luc: string;
}

export type ArticleCard = Pick<
  ArticleBaiViet,
  "id" | "slug" | "tieu_de" | "loai_bai_viet" | "tom_tat"
> & { loai_quan_he?: string | null };

export type TruongNganhRow = {
  ten_chuong_trinh?: string | null;
  he_dao_tao?: string | null;
  thoi_gian_thang?: number | null;
  org_to_chuc?: {
    ten?: string | null;
    slug?: string | null;
    logo_id?: string | null;
  } | null;
};

export type TacPhamStub = {
  id: string;
  slug?: string | null;
  tieu_de?: string | null;
};

/** Tác phẩm gallery (embed hoặc fallback) */
export type TacPhamGalleryItem = {
  id: string;
  tieu_de?: string | null;
  cover_id?: string | null;
  loai_tac_pham?: string | null;
  author_slug?: string | null;
  author_name?: string | null;
};

export type CotMocStub = {
  id: string;
  slug?: string | null;
  tieu_de?: string | null;
};

/** Dòng danh sách `/bai-viet` */
export type ArticleListItem = {
  id: string;
  slug: string;
  tieu_de: string;
  loai_bai_viet: LoaiBaiViet | string;
  tom_tat: string | null;
  cap_nhat_luc: string;
  luot_xem: number;
  trang_thai_noi_dung: string;
};

/** Bài loại `nghe` cho hub `/nghe-nghiep` */
export type NgheArticleHubRow = {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_eng: string | null;
  tom_tat: string | null;
  cover_id: string | null;
  /** Gán qua `article_lien_quan` → bài `linh_vuc` (slug khớp `lv_linh_vuc`) */
  linh_vuc_id: string[] | null;
};
