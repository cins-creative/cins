import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { fetchTacGiaListForArticle } from "./fetch";
import type { ArticleTacGiaListItem } from "./types";

export type ArticleAttribution = {
  idTacGiaChinh: string | null;
  soNguoiDongGop: number;
  tacGiaChinh: ArticleTacGiaListItem | null;
  contributors: ArticleTacGiaListItem[];
};

export async function fetchArticleAttribution(
  idBaiViet: string,
): Promise<ArticleAttribution> {
  const admin = createServiceRoleClient();
  const { data: article, error } = await admin
    .from("article_bai_viet")
    .select("id_tac_gia_chinh, so_nguoi_dong_gop")
    .eq("id", idBaiViet)
    .maybeSingle<{
      id_tac_gia_chinh: string | null;
      so_nguoi_dong_gop: number | null;
    }>();

  if (error) throw new Error(error.message);

  const contributors = await fetchTacGiaListForArticle(idBaiViet);
  const tacGiaChinh =
    contributors.find((c) => c.la_hien_tai) ??
    contributors.find((c) => c.vai_tro === "tac_gia_chinh") ??
    null;

  const uniqueContributorIds = new Set(contributors.map((c) => c.id_nguoi_dung));

  return {
    idTacGiaChinh: article?.id_tac_gia_chinh ?? tacGiaChinh?.id_nguoi_dung ?? null,
    soNguoiDongGop:
      article?.so_nguoi_dong_gop ??
      uniqueContributorIds.size,
    tacGiaChinh,
    contributors,
  };
}
