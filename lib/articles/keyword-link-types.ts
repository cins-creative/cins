/** Keyword — `phrases` lấy từ `article_bai_viet.tieu_de`. */
export type KeywordLinkEntry = {
  id: string;
  slug: string;
  href: string;
  title: string;
  summary: string | null;
  thumbUrl: string | null;
  thumbnail?: string | null;
  cover_id?: string | null;
  phrases: string[];
};

export type LinkKeywordsOptions = {
  /** Không gắn link tới bài keyword đang đọc. */
  excludeSlug?: string;
  /** Tối đa số lần gắn / slug (0 hoặc bỏ qua = không giới hạn). */
  maxPerSlug?: number;
};
