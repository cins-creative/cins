import "server-only";

import { buildContentPreview } from "@/lib/admin/article-preview";
import { stripArticleWrapper } from "@/lib/article/blocks/compile-html";
import { isComposeSkeletonOrEmpty } from "@/lib/article/compose/skeleton";
import { articlePublicHref } from "@/lib/articles/article-href";
import { resolveArticleThumbnailOnlySync } from "@/lib/bai-viet/thumbnail";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  contribTopicTitle,
  unpackContribNoiDung,
} from "./contrib-document";
import { fetchDongGopListForAdmin } from "./fetch";
import type { AdminDongGopRow, ArticleDongGopAdminItem } from "./types";

export type DongGopChoDuyetBaiStat = {
  count: number;
  moiNhat: string;
};

function mapAdminRow(item: ArticleDongGopAdminItem): AdminDongGopRow | null {
  const entity = item.bai_viet;
  if (!entity?.slug || !entity.tieu_de) return null;

  const loai = String(entity.loai_bai_viet);
  const contributor = item.nguoi_dong_gop;
  const unpacked = unpackContribNoiDung(item.noi_dung ?? "");
  const bodyHtml = stripArticleWrapper(unpacked.bodyHtml).trim();
  const bodyIsSkeleton = isComposeSkeletonOrEmpty(bodyHtml, loai);
  const { hero } = unpacked;

  const preview = bodyIsSkeleton
    ? { preview: "" }
    : buildContentPreview({ noi_dung: bodyHtml });
  const excerptText =
    hero.tom_tat.trim() ||
    hero.tieu_de_viet.trim() ||
    hero.tieu_de_eng.trim() ||
    preview.preview ||
    null;

  const heroTitle = contribTopicTitle(hero, "") || null;

  const thumbRaw = hero.thumbnail.trim();
  const thumbnailUrl = thumbRaw
    ? /^https?:\/\//i.test(thumbRaw)
      ? thumbRaw
      : resolveArticleThumbnailOnlySync(thumbRaw)
    : null;

  return {
    id: item.id,
    idBaiViet: item.id_bai_viet,
    trangThai: item.trang_thai,
    noiDung: item.noi_dung,
    bodyHtml: bodyIsSkeleton ? "" : bodyHtml,
    ghiChuDuyet: item.ghi_chu_duyet,
    taoLuc: item.tao_luc,
    capNhatLuc: item.cap_nhat_luc,
    duyetLuc: item.duyet_luc,
    heroTitle,
    excerpt: excerptText,
    thumbnailUrl,
    entity: {
      slug: entity.slug,
      tieuDe: entity.tieu_de,
      loaiBaiViet: loai,
      noiDungChinh: entity.noi_dung ?? null,
      href: articlePublicHref(loai, entity.slug),
    },
    contributor: contributor
      ? {
          id: contributor.id,
          slug: contributor.slug,
          tenHienThi: contributor.ten_hien_thi,
          avatarUrl: getAvatarUrl(contributor.avatar_id ?? null),
        }
      : null,
  };
}

export async function listDongGopForAdmin(options?: {
  idBaiViet?: string;
}): Promise<AdminDongGopRow[]> {
  const items = await fetchDongGopListForAdmin({
    limit: 200,
    idBaiViet: options?.idBaiViet,
  });
  return items.map(mapAdminRow).filter((r): r is AdminDongGopRow => r != null);
}

export async function countDongGopChoDuyetForAdmin(): Promise<number> {
  const admin = createServiceRoleClient();
  const { count, error } = await admin
    .from("article_dong_gop")
    .select("id", { count: "exact", head: true })
    .eq("trang_thai", "cho_duyet")
    .eq("da_xoa", false);

  if (error) return 0;
  return count ?? 0;
}

/** Thống kê đóng góp chờ duyệt theo bài — dùng sort/badge admin list. */
export async function fetchDongGopChoDuyetStatsByBai(): Promise<
  Map<string, DongGopChoDuyetBaiStat>
> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_dong_gop")
    .select("id_bai_viet, cap_nhat_luc")
    .eq("trang_thai", "cho_duyet")
    .eq("da_xoa", false)
    .order("cap_nhat_luc", { ascending: false })
    .limit(5000);

  const map = new Map<string, DongGopChoDuyetBaiStat>();
  if (error || !data) return map;

  for (const row of data) {
    const idBai = String(
      (row as { id_bai_viet?: string }).id_bai_viet ?? "",
    ).trim();
    const moiNhat = String(
      (row as { cap_nhat_luc?: string }).cap_nhat_luc ?? "",
    );
    if (!idBai) continue;
    const prev = map.get(idBai);
    if (!prev) {
      map.set(idBai, { count: 1, moiNhat });
      continue;
    }
    prev.count += 1;
    if (moiNhat && moiNhat > prev.moiNhat) prev.moiNhat = moiNhat;
  }
  return map;
}
