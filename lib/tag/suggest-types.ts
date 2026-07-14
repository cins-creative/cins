import type { PickableTagLoai } from "@/lib/tag/tag-loai";

/** Một dòng trong index gợi ý tag — dùng chung client + server. */
export type TagSuggestRow = {
  id: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  da_verify: boolean;
  loai_bai_viet: PickableTagLoai;
  linh_vuc_ten: string | null;
  so_nguoi_tagged: number;
  cover_id: string | null;
};

export const TAG_SUGGEST_MAX = 7;
export const TAG_SUGGEST_INDEX_MAX = 2500;
export const TAG_SUGGEST_CACHE_KEY = "cins:tag-suggest-index:v2";
export const TAG_SUGGEST_CACHE_TTL_MS = 10 * 60 * 1000;
export const TAG_SUGGEST_DEBOUNCE_MS = 50;
