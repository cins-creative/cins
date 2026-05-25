import type { ArticleNhomEmbedRow } from "@/lib/bai-viet/nhom-embed";

export type { ArticleNhomEmbedRow };

export type BlogHubRow = {
  id: string;
  slug: string;
  loai_bai_viet: string;
  tieu_de: string;
  tieu_de_eng: string | null;
  tom_tat: string | null;
  cover_id: string | null;
  thumbnail: string | null;
  luot_xem: number;
  tao_luc: string;
  cap_nhat_luc: string;
  cover_url: string | null;
  thumb_url: string | null;
  article_nhom_all: ArticleNhomEmbedRow[] | null;
  bo_phan: ArticleNhomEmbedRow | null;
  cap_do: ArticleNhomEmbedRow | null;
  ky_thuat: ArticleNhomEmbedRow | null;
};

export type BlogHubLoaiTab = {
  id: string;
  label: string;
  dotClass: string;
  count: number;
};

export type BlogHubFilterNhom = {
  slug: string;
  ten: string;
  loai_nhom: string;
  thu_tu: number;
};

export type BlogHubResult = {
  ok: boolean;
  items: BlogHubRow[];
  total: number;
  loaiTabs: BlogHubLoaiTab[];
  capDoOptions: BlogHubFilterNhom[];
  latestUpdate: string | null;
  message?: string;
};

export type BlogRelatedCard = {
  id: string;
  slug: string;
  tieu_de: string;
  tom_tat: string | null;
  cover_url: string | null;
  tao_luc: string;
  eyebrow: string | null;
};

export type BlogExploreLink = {
  id: string;
  slug: string;
  tieu_de: string;
  loai_bai_viet: string;
  loai_quan_he: string;
};
