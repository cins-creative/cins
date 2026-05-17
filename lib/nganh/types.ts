import type { ArticleNhomHubEmbed } from "@/lib/career/types";
import type { MetaNganhDaoTao } from "@/lib/articles/types";

export type NganhHubItem = {
  id: string;
  slug: string;
  title: string;
  titleEng: string | null;
  titleVi: string | null;
  short_description: string | null;
  ma_nganh: string | null;
  khoi_thi: string[];
  cover_id: string | null;
  article_nhom_id?: string | null;
  article_nhom?: ArticleNhomHubEmbed | null;
  article_nhom_all?: ArticleNhomHubEmbed[] | null;
};

export type NganhHubSection = {
  id: string;
  nhomId: string | null;
  thu_tu: number;
  title: string;
  intro: string | null;
  items: NganhHubItem[];
};

export type NganhSidebarGroup = {
  id: string;
  heading: string;
  /** `article_nhom.slug` — map màu rail */
  nhomKey: string;
  thu_tu: number;
  links: { id: string; slug: string; label: string }[];
};

export type NganhDetailArticle = {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  tom_tat: string | null;
  mo_ta_ngan?: string | null;
  noi_dung: string | null;
  meta: MetaNganhDaoTao | null;
  cap_nhat_luc: string;
  article_nhom?: ArticleNhomHubEmbed | null;
};
