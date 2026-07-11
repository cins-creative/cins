import "server-only";

import { buildContentPreview } from "@/lib/admin/article-preview";
import { stripArticleWrapper } from "@/lib/article/blocks/compile-html";
import { isComposeSkeletonOrEmpty } from "@/lib/article/compose/skeleton";
import { resolveArticleThumbnailOnlySync } from "@/lib/bai-viet/thumbnail";
import { getAvatarUrl } from "@/lib/journey/profile";

import {
  mergeContribHero,
  unpackContribNoiDung,
  type ContribHeroMeta,
  type EntityContributionSeed,
} from "./contrib-document";
import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";

import {
  fetchDongGopCommentCounts,
  fetchDongGopCommentsByDongGopIds,
} from "./comments";
import { fetchDongGopListForArticle, fetchDongGopByUserAndArticle } from "./fetch";
import { resolveDongGopEditorInitialHtml } from "./skeleton";
import type { ArticleDongGopListItem, TrangThaiDongGop } from "./types";
import {
  canContributorEditDongGop,
  canContributorSubmitDongGop,
} from "./types";

export type ContributionPublicItem = {
  id: string;
  trangThai: TrangThaiDongGop;
  excerpt: string | null;
  capNhatLuc: string;
  daTungLaBaiChinh: boolean;
  isViewerOwn: boolean;
  isHidden: boolean;
  ghiChuDuyet: string | null;
  soBinhLuan: number;
  /** Thread CommentBlock (social_binh_luan / Journey). */
  comments: MilestonePostComment[];
  hero: ContribHeroMeta;
  thumbnailUrl: string | null;
  bodyHtml: string;
  contributor: {
    id: string;
    slug: string | null;
    tenHienThi: string | null;
    avatarUrl: string | null;
    href: string | null;
  };
};

export type EntityContributionTabData = {
  items: ContributionPublicItem[];
  count: number;
  viewerHasDraft: boolean;
  viewerEditor: ViewerContributionEditorState | null;
};

export type ViewerContributionEditorState = {
  id: string | null;
  trangThai: TrangThaiDongGop | null;
  ghiChuDuyet: string | null;
  initialNoiDung: string;
  initialHero: ContribHeroMeta;
  canEdit: boolean;
  canSubmit: boolean;
};

function isPubliclyVisible(
  item: ArticleDongGopListItem,
  viewerProfileId: string | null,
): boolean {
  if (item.trang_thai !== "nhap") return true;
  return (
    viewerProfileId != null && item.id_nguoi_dong_gop === viewerProfileId
  );
}

function mapPublicItem(
  item: ArticleDongGopListItem,
  viewerProfileId: string | null,
  loaiBaiViet: string,
): ContributionPublicItem {
  const contributor = item.nguoi_dong_gop;
  const slug = contributor?.slug?.trim() ?? null;
  const tenHienThi = contributor?.ten_hien_thi?.trim() ?? null;
  const unpacked = unpackContribNoiDung(item.noi_dung ?? "");
  const bodyHtml = unpacked.bodyHtml;
  const bodyForPreview = stripArticleWrapper(bodyHtml);
  const bodyIsSkeleton = isComposeSkeletonOrEmpty(bodyForPreview, loaiBaiViet);
  const preview = bodyIsSkeleton
    ? { preview: "" }
    : buildContentPreview({
        noi_dung: bodyHtml,
      });
  const excerptText =
    unpacked.hero.tom_tat ||
    unpacked.hero.tieu_de_viet ||
    unpacked.hero.tieu_de_eng ||
    preview.preview;
  const thumbRaw = unpacked.hero.thumbnail.trim();
  const thumbnailUrl = thumbRaw
    ? /^https?:\/\//i.test(thumbRaw)
      ? thumbRaw
      : resolveArticleThumbnailOnlySync(thumbRaw)
    : null;

  return {
    id: item.id,
    trangThai: item.trang_thai,
    excerpt: excerptText || null,
    capNhatLuc: item.cap_nhat_luc,
    daTungLaBaiChinh: item.trang_thai === "duoc_duyet",
    isViewerOwn:
      viewerProfileId != null && item.id_nguoi_dong_gop === viewerProfileId,
    isHidden: !item.hien_thi,
    ghiChuDuyet: item.ghi_chu_duyet?.trim() || null,
    soBinhLuan: 0,
    comments: [],
    hero: unpacked.hero,
    thumbnailUrl,
    bodyHtml,
    contributor: {
      id: contributor?.id ?? item.id_nguoi_dong_gop,
      slug,
      tenHienThi,
      avatarUrl: getAvatarUrl(contributor?.avatar_id ?? null),
      href: slug ? `/${slug}` : null,
    },
  };
}

export async function listDongGopForEntityTab(
  idBaiViet: string,
  viewerProfileId: string | null = null,
  options?: {
    loaiBaiViet?: string;
    entityTitle?: string | null;
    entitySeed?: EntityContributionSeed;
  },
): Promise<EntityContributionTabData> {
  const raw = await fetchDongGopListForArticle(idBaiViet, {
    includeHidden: viewerProfileId != null,
  });
  const visible = raw.filter((item) => {
    if (!item.hien_thi) {
      return (
        viewerProfileId != null && item.id_nguoi_dong_gop === viewerProfileId
      );
    }
    return isPubliclyVisible(item, viewerProfileId);
  });
  let items = visible.map((item) =>
    mapPublicItem(item, viewerProfileId, options?.loaiBaiViet ?? "keyword"),
  );
  const publicCount = visible.filter((item) => item.hien_thi).length;

  if (items.length > 0) {
    const dongGopIds = items.map((item) => item.id);
    const [countMap, threadMap] = await Promise.all([
      fetchDongGopCommentCounts(dongGopIds),
      fetchDongGopCommentsByDongGopIds(dongGopIds, viewerProfileId),
    ]);
    items = items.map((item) => ({
      ...item,
      soBinhLuan: countMap.get(item.id) ?? 0,
      comments: threadMap.get(item.id) ?? [],
    }));
  }
  const viewerRaw =
    viewerProfileId != null
      ? (raw.find((item) => item.id_nguoi_dong_gop === viewerProfileId) ??
        (await fetchDongGopByUserAndArticle(viewerProfileId, idBaiViet)))
      : null;
  const viewerHasDraft = viewerRaw != null;

  let viewerEditor: ViewerContributionEditorState | null = null;
  if (viewerProfileId != null) {
    const trangThai = viewerRaw?.trang_thai ?? null;
    const seed = options?.entitySeed;
    const initialNoiDung = resolveDongGopEditorInitialHtml({
      loaiBaiViet: options?.loaiBaiViet ?? "keyword",
      entityTitle: options?.entityTitle,
      existingNoiDung: viewerRaw?.noi_dung,
      entitySeed: seed,
    });
    const unpacked = unpackContribNoiDung(initialNoiDung, seed);
    viewerEditor = {
      id: viewerRaw?.id ?? null,
      trangThai,
      ghiChuDuyet: viewerRaw?.ghi_chu_duyet ?? null,
      initialNoiDung,
      initialHero: mergeContribHero(unpacked.hero, seed),
      canEdit: trangThai ? canContributorEditDongGop(trangThai) : true,
      canSubmit: trangThai ? canContributorSubmitDongGop(trangThai) : true,
    };
  }

  return {
    items,
    count: publicCount,
    viewerHasDraft: viewerRaw != null,
    viewerEditor,
  };
}
