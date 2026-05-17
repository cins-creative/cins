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
  mon_nang_khieu?: string | null;
  thoi_gian_dao_tao?: string | null;
  /** URL đầy đủ hoặc Cloudflare Images id */
  editorial_images?: string[];
};

export type MetaNgheBaiViet = {
  video_url?: string | null;
};

export type ArticleMeta =
  | MetaPhanMem
  | MetaNganhDaoTao
  | MetaNgheBaiViet
  | null;

/** Embed `linh_vuc` từ FK `article_bai_viet.id_linh_vuc` (bài `nghe`). */
export type LinhVucEmbed = {
  id: string;
  slug: string;
  ten: string;
};

export interface ArticleBaiViet {
  id: string;
  slug: string;
  tieu_de: string;
  /** FK → `linh_vuc.id` — bắt buộc với `loai_bai_viet = nghe`. */
  id_linh_vuc?: string | null;
  linh_vuc?: LinhVucEmbed | null;
  /** Dòng phụ tiếng Việt trong hero (ví dụ `<em>` dưới H1). */
  tieu_de_viet?: string | null;
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
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  tom_tat: string | null;
  cover_id: string | null;
  article_nhom_id?: string | null;
  /** Điền sau truy vấn `article_nhom` — đủ field theo bảng public.article_nhom */
  article_nhom?: {
    id: string;
    slug: string;
    ten: string;
    mo_ta: string | null;
    loai_nhom: string;
    thu_tu: number;
  } | null;
  /** Mọi nhóm từ `article_gan_nhom` (một bài có thể gán nhiều `id_nhom`). */
  article_nhom_all?: {
    id: string;
    slug: string;
    ten: string;
    mo_ta: string | null;
    loai_nhom: string;
    thu_tu: number;
  }[] | null;
  /** FK trực tiếp `article_bai_viet.id_linh_vuc` (mảng 1 phần tử cho tương thích hub). */
  id_linh_vuc?: string | null;
  linh_vuc?: LinhVucEmbed | null;
  linh_vuc_id: string[] | null;
  linh_vuc_slugs: string[] | null;
};
