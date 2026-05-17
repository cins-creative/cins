/** JSONB main_content */
export type MainContent = {
  la_ai?: string;
  cong_viec?: WorkItem[];
  lien_quan_text?: string;
};

export type WorkItem = {
  thu_tu: number;
  tieu_de: string;
  noi_dung: string;
};

export type RoadmapItem = {
  thu_tu: number;
  tieu_de: string;
  noi_dung: string;
};

export type SkillDetail = {
  skill_id: string;
  noi_dung: string;
};

/** Bảng nn_bo_phan — embed qua FK nn_bo_phan_id */
export type NnBoPhanRow = {
  id: string;
  ten: string;
  mo_ta: string | null;
  created_at?: string | null;
};

/** Hàng bảng nn_nghe_nghiep — các trường optional để an toàn schema */
export type NgheNghiepRow = {
  id: string;
  slug: string;
  title_eng: string | null;
  title_vietnam: string | null;
  short_description: string | null;
  nn_bo_phan_id: string | null;
  /** Embed PostgREST: `nn_bo_phan ( ten, mo_ta )` */
  nn_bo_phan: Pick<NnBoPhanRow, "ten" | "mo_ta"> | null;
  /** Legacy — giữ khi cần fallback; ưu tiên `nn_bo_phan.ten` */
  bo_phan: string | null;
  main_content: MainContent | null;
  lo_trinh: RoadmapItem[] | null;
  skill_detail: SkillDetail[] | null;
  skill_id: string[] | null;
  main_video: string | null;
  showreel_video_url: string | null;
  hinh_minh_hoa_url: string | null;
  thumbnail_mascot: string | null;
  linh_vuc_id: string[] | null;
  nghe_nghiep_id: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  trang_thai?: string | null;
};

export type KyNangRow = {
  id: string;
  title_vietnam: string | null;
  icon: string | null;
  loai: string | null;
};

export type NgheNghiepListItem = Pick<
  NgheNghiepRow,
  | "slug"
  | "title_eng"
  | "title_vietnam"
  | "thumbnail_mascot"
  | "bo_phan"
  | "nn_bo_phan_id"
  | "nn_bo_phan"
> & { id: string };

/** Nhóm bài (`article_nhom`) — `bo_phan` | `ky_thuat` | `nhom_nganh` | `cap_do`. */
export type ArticleNhomHubEmbed = {
  id: string;
  slug: string;
  ten: string;
  mo_ta: string | null;
  loai_nhom: string;
  thu_tu: number;
};

export type LinhVucHubEmbed = {
  id: string;
  slug: string;
  ten: string;
};

/** Danh sách hub — thêm lĩnh vực + mô tả ngắn cho card/section */
export type NgheNghiepHubItem = NgheNghiepListItem &
  Pick<NgheNghiepRow, "linh_vuc_id" | "short_description"> & {
    /** FK trực tiếp trên `article_bai_viet`. */
    id_linh_vuc?: string | null;
    linh_vuc?: LinhVucHubEmbed | null;
    linh_vuc_slugs?: string[] | null;
    article_nhom_id?: string | null;
    article_nhom?: ArticleNhomHubEmbed | null;
    article_nhom_all?: ArticleNhomHubEmbed[] | null;
  };

export type RelatedCareerCard = {
  id: string;
  slug: string;
  title_eng: string | null;
  title_vietnam: string | null;
  thumbnail_mascot: string | null;
  nn_bo_phan_id: string | null;
  nn_bo_phan: Pick<NnBoPhanRow, "ten" | "mo_ta"> | null;
  bo_phan: string | null;
};

export type LinhVucRow = {
  id: string;
  slug?: string | null;
  /** Schema CINs (Supabase) */
  ten_vi?: string | null;
  ten_en?: string | null;
  mo_ta?: string | null;
  title_vietnam?: string | null;
  name?: string | null;
  mau_accent?: string | null;
  /** Tham chiếu lĩnh vực cha — bảng lv_linh_vuc tự tham chiếu (tuỳ schema) */
  linh_vuc_id?: string | null;
  /** Nhóm hiển thị sidebar — các dòng cùng giá trị gộp một tiêu đề */
  nhom_vi?: string | null;
  /** Một số schema: bảng `linh_vuc` dùng `nhom` / `ten` (ưu tiên map vào đây khi query) */
  nhom?: string | null;
  ten?: string | null;
  /** Bảng `linh_vuc`: thứ tự hiển thị trong nhóm */
  thu_tu?: number | null;
  /** Bảng `linh_vuc`: ví dụ `active` */
  trang_thai?: string | null;
  cover_id?: string | null;
};
