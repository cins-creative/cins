import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { getAvatarUrl } from "@/lib/journey/profile";

import { fetchTacGiaListForArticle } from "./fetch";
import type {
  ArticleTacGiaListItem,
  EntityAttributionDisplay,
  EntityContributorDisplay,
} from "./types";

export type ArticleAttribution = {
  idTacGiaChinh: string | null;
  soNguoiDongGop: number;
  tacGiaChinh: ArticleTacGiaListItem | null;
  contributors: ArticleTacGiaListItem[];
};

function mapContributor(item: ArticleTacGiaListItem): EntityContributorDisplay {
  const user = item.nguoi_dung;
  const slug = user?.slug?.trim() ?? null;

  return {
    id: item.id_nguoi_dung,
    slug,
    tenHienThi: user?.ten_hien_thi?.trim() ?? null,
    avatarUrl: getAvatarUrl(user?.avatar_id ?? null),
    href: slug ? `/${slug}` : null,
    vaiTro: item.vai_tro,
    laHienTai: item.la_hien_tai,
    taoLuc: item.tao_luc,
  };
}

export function mapAttributionForDisplay(
  raw: ArticleAttribution,
): EntityAttributionDisplay {
  const contributors = raw.contributors.map(mapContributor);
  const tacGiaChinh = raw.tacGiaChinh ? mapContributor(raw.tacGiaChinh) : null;
  const uniqueCount = new Set(raw.contributors.map((c) => c.id_nguoi_dung)).size;

  return {
    tacGiaChinh,
    soNguoiDongGop: Math.max(raw.soNguoiDongGop, uniqueCount),
    contributors,
  };
}

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
