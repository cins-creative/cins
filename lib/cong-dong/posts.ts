import "server-only";

import { loadAuthorBadges } from "@/lib/cong-dong/author-badges";
import {
  attachFiltersToPost,
  getMatchingPostIdsForFilters,
  loadFiltersForPosts,
  resolveFilterIdsBySlugs,
  validateFilterIdsForOrg,
} from "@/lib/cong-dong/filters";
import {
  FEED_PAGE_SIZE,
  SOCIAL_LOAI_DOI_TUONG,
  THAO_LUAN_LOAI_CONTEXT,
  THAO_LUAN_LOAI_POST,
} from "@/lib/cong-dong/constants";
import { ensureContentMediaIds } from "@/lib/cong-dong/media";
import { isThanhVien, loadAuthorOrgRoles } from "@/lib/cong-dong/membership";
import { authorRoleBadgeLabel } from "@/lib/cong-dong/vai-tro";
import { loadTacPhamMirrors } from "@/lib/cong-dong/tac-pham-mirror";
import { loadAuthorOrgPostMetaInOrg } from "@/lib/cong-dong/stats";
import type { CongDongComment, CongDongPost } from "@/lib/cong-dong/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_POST_LEN = 8000;
const MAX_COMMENT_LEN = 2000;

type ThaoLuanRow = {
  id: string;
  nguoi_dang: string;
  tieu_de: string | null;
  noi_dung: string;
  ghim: boolean;
  tao_luc: string;
  id_tac_pham: string | null;
};

const THAO_LUAN_SELECT =
  "id, nguoi_dang, tieu_de, noi_dung, ghim, tao_luc, id_tac_pham";

async function loadPostMedia(
  postIds: string[],
): Promise<Map<string, CongDongPost["media"]>> {
  const out = new Map<string, CongDongPost["media"]>();
  if (postIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: links } = await admin
    .from("content_thao_luan_media")
    .select("id_thao_luan, thu_tu, content_media(id, cloudflare_id)")
    .in("id_thao_luan", postIds)
    .order("thu_tu", { ascending: true })
    .returns<
      Array<{
        id_thao_luan: string;
        thu_tu: number;
        content_media: { id: string; cloudflare_id: string | null } | null;
      }>
    >();

  for (const link of links ?? []) {
    const cfId = link.content_media?.cloudflare_id?.trim();
    const mediaId = link.content_media?.id;
    if (!cfId || !mediaId) continue;
    const list = out.get(link.id_thao_luan) ?? [];
    list.push({
      id: mediaId,
      cloudflareId: cfId,
      thuTu: link.thu_tu,
    });
    out.set(link.id_thao_luan, list);
  }

  return out;
}

async function loadReactionMeta(
  postIds: string[],
  viewerId: string | null,
): Promise<Map<string, { count: number; liked: boolean }>> {
  const out = new Map<string, { count: number; liked: boolean }>();
  for (const id of postIds) out.set(id, { count: 0, liked: false });
  if (postIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: reactions } = await admin
    .from("social_reaction")
    .select("id_doi_tuong, id_nguoi_dung")
    .eq("loai_doi_tuong", SOCIAL_LOAI_DOI_TUONG.THAO_LUAN)
    .in("id_doi_tuong", postIds)
    .eq("emoji", "heart")
    .returns<Array<{ id_doi_tuong: string; id_nguoi_dung: string }>>();

  for (const row of reactions ?? []) {
    const prev = out.get(row.id_doi_tuong) ?? { count: 0, liked: false };
    prev.count += 1;
    if (viewerId && row.id_nguoi_dung === viewerId) prev.liked = true;
    out.set(row.id_doi_tuong, prev);
  }

  return out;
}

async function loadCommentCounts(
  postIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (postIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_binh_luan")
    .select("id_doi_tuong")
    .eq("loai_doi_tuong", SOCIAL_LOAI_DOI_TUONG.THAO_LUAN)
    .in("id_doi_tuong", postIds)
    .eq("da_xoa", false)
    .returns<Array<{ id_doi_tuong: string }>>();

  for (const row of rows ?? []) {
    out.set(row.id_doi_tuong, (out.get(row.id_doi_tuong) ?? 0) + 1);
  }
  return out;
}

async function mapPosts(
  rows: ThaoLuanRow[],
  orgId: string,
  viewerId: string | null,
): Promise<CongDongPost[]> {
  if (rows.length === 0) return [];
  const postIds = rows.map((r) => r.id);
  const authorIds = rows.map((r) => r.nguoi_dang);

  const tacPhamIds = rows
    .map((r) => r.id_tac_pham)
    .filter((id): id is string => Boolean(id));

  const [
    badges,
    orgRoles,
    mediaByPost,
    reactions,
    commentCounts,
    filtersByPost,
    tacPhamMirrors,
    authorPostCountsInOrg,
  ] = await Promise.all([
    loadAuthorBadges(authorIds),
    loadAuthorOrgRoles(orgId, authorIds),
    loadPostMedia(postIds),
    loadReactionMeta(postIds, viewerId),
    loadCommentCounts(postIds),
    loadFiltersForPosts(postIds),
    loadTacPhamMirrors(tacPhamIds),
    loadAuthorOrgPostMetaInOrg(orgId, authorIds),
  ]);

  return rows.map((row) => {
    const baseAuthor = badges.get(row.nguoi_dang) ?? {
      id: row.nguoi_dang,
      slug: "user",
      tenHienThi: "Thành viên",
      avatarId: null,
      ngheLabel: null,
      vaiTroLabel: null,
      verifiedCount: 0,
      soBaiVietTrongNhom: 0,
    };
    const author = {
      ...baseAuthor,
      vaiTroLabel: authorRoleBadgeLabel(orgRoles.get(row.nguoi_dang) ?? null),
      soBaiVietTrongNhom:
        authorPostCountsInOrg.get(row.nguoi_dang)?.count ??
        baseAuthor.soBaiVietTrongNhom,
    };
    const reaction = reactions.get(row.id) ?? { count: 0, liked: false };
    return {
      id: row.id,
      tieuDe: row.tieu_de,
      noiDung: row.noi_dung,
      ghim: row.ghim,
      taoLuc: row.tao_luc,
      author,
      media: mediaByPost.get(row.id) ?? [],
      filters: filtersByPost.get(row.id) ?? [],
      journeyMirror: row.id_tac_pham
        ? (tacPhamMirrors.get(row.id_tac_pham) ?? null)
        : null,
      likeCount: reaction.count,
      commentCount: commentCounts.get(row.id) ?? 0,
      viewerLiked: reaction.liked,
    };
  });
}

export async function listCongDongPosts(params: {
  orgId: string;
  cursor?: string | null;
  limit?: number;
  viewerId?: string | null;
  filterSlugs?: string[];
}): Promise<{ posts: CongDongPost[]; nextCursor: string | null }> {
  const admin = createServiceRoleClient();
  const limit = Math.min(params.limit ?? FEED_PAGE_SIZE, FEED_PAGE_SIZE);
  const filterSlugs = (params.filterSlugs ?? []).filter(Boolean);

  let matchingPostIds: string[] | null = null;
  if (filterSlugs.length > 0) {
    const filterIds = await resolveFilterIdsBySlugs(params.orgId, filterSlugs);
    if (filterIds.length === 0) {
      return { posts: [], nextCursor: null };
    }
    matchingPostIds = await getMatchingPostIdsForFilters(filterIds);
    if (matchingPostIds.length === 0) {
      return { posts: [], nextCursor: null };
    }
  }

  const applyPostIdFilter = <T extends { in: (col: string, vals: string[]) => T }>(
    query: T,
  ): T => {
    if (!matchingPostIds) return query;
    return query.in("id", matchingPostIds);
  };

  const { data: pinned } = await applyPostIdFilter(
    admin
      .from("content_thao_luan")
      .select(THAO_LUAN_SELECT)
      .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
      .eq("id_context", params.orgId)
      .eq("da_xoa", false)
      .eq("ghim", true)
      .order("tao_luc", { ascending: false })
      .limit(5),
  ).returns<ThaoLuanRow[]>();

  let feedQuery = applyPostIdFilter(
    admin
      .from("content_thao_luan")
      .select(THAO_LUAN_SELECT)
      .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
      .eq("id_context", params.orgId)
      .eq("da_xoa", false)
      .eq("ghim", false)
      .order("tao_luc", { ascending: false })
      .limit(limit + 1),
  );

  if (params.cursor) {
    feedQuery = feedQuery.lt("tao_luc", params.cursor);
  }

  const { data: feedRows } = await feedQuery.returns<ThaoLuanRow[]>();

  const hasMore = (feedRows?.length ?? 0) > limit;
  const pageRows = (feedRows ?? []).slice(0, limit);
  const pinnedIds = new Set((pinned ?? []).map((p) => p.id));
  const mergedRows = [
    ...(params.cursor ? [] : (pinned ?? [])),
    ...pageRows.filter((r) => !pinnedIds.has(r.id)),
  ];

  const posts = await mapPosts(mergedRows, params.orgId, params.viewerId ?? null);
  const nextCursor =
    hasMore && pageRows.length > 0
      ? pageRows[pageRows.length - 1]?.tao_luc ?? null
      : null;

  return { posts, nextCursor };
}

export async function createCongDongPost(params: {
  orgId: string;
  authorId: string;
  noiDung: string;
  tieuDe?: string;
  mediaIds?: string[];
  filterIds?: string[];
  idTacPham?: string | null;
}): Promise<
  | { ok: true; data: CongDongPost }
  | { ok: false; error: string }
> {
  const text = params.noiDung?.trim();
  if (!text) return { ok: false, error: "Nội dung bài đăng trống." };
  if (text.length > MAX_POST_LEN) {
    return { ok: false, error: `Bài đăng tối đa ${MAX_POST_LEN} ký tự.` };
  }

  if (!(await isThanhVien(params.authorId, params.orgId))) {
    return { ok: false, error: "Chỉ thành viên mới được đăng bài." };
  }

  const filterCheck = await validateFilterIdsForOrg(
    params.orgId,
    params.filterIds ?? [],
  );
  if (!filterCheck.ok) return { ok: false, error: filterCheck.error };

  const admin = createServiceRoleClient();
  const { data: inserted, error } = await admin
    .from("content_thao_luan")
    .insert({
      nguoi_dang: params.authorId,
      loai_context: THAO_LUAN_LOAI_CONTEXT.CONG_DONG,
      id_context: params.orgId,
      tieu_de: params.tieuDe?.trim() || null,
      noi_dung: text,
      loai_post: THAO_LUAN_LOAI_POST.THAO_LUAN,
      ...(params.idTacPham ? { id_tac_pham: params.idTacPham } : {}),
    })
    .select(THAO_LUAN_SELECT)
    .single<ThaoLuanRow>();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Không đăng được bài." };
  }

  const mediaUuids = await ensureContentMediaIds(params.mediaIds ?? []);
  if (mediaUuids.length > 0) {
    const { error: linkError } = await admin.from("content_thao_luan_media").insert(
      mediaUuids.map((id_media, index) => ({
        id_thao_luan: inserted.id,
        id_media,
        thu_tu: index,
      })),
    );
    if (linkError) {
      await admin
        .from("content_thao_luan")
        .update({ da_xoa: true })
        .eq("id", inserted.id);
      return { ok: false, error: linkError.message };
    }
  }

  if (filterCheck.ids.length > 0) {
    const linkFilters = await attachFiltersToPost(inserted.id, filterCheck.ids);
    if (!linkFilters.ok) {
      await admin
        .from("content_thao_luan")
        .update({ da_xoa: true })
        .eq("id", inserted.id);
      return { ok: false, error: linkFilters.error };
    }
  }

  const [post] = await mapPosts([inserted], params.orgId, params.authorId);
  return { ok: true, data: post! };
}

export async function listThaoLuanComments(
  postId: string,
): Promise<CongDongComment[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_binh_luan")
    .select("id, noi_dung, tao_luc, nguoi_binh_luan")
    .eq("loai_doi_tuong", SOCIAL_LOAI_DOI_TUONG.THAO_LUAN)
    .eq("id_doi_tuong", postId)
    .eq("da_xoa", false)
    .is("id_cha", null)
    .order("tao_luc", { ascending: true })
    .limit(50)
    .returns<
      Array<{
        id: string;
        noi_dung: string;
        tao_luc: string;
        nguoi_binh_luan: string;
      }>
    >();

  const authorIds = [...new Set((rows ?? []).map((r) => r.nguoi_binh_luan))];
  const badges = await loadAuthorBadges(authorIds);

  return (rows ?? []).map((row) => {
    const author = badges.get(row.nguoi_binh_luan);
    return {
      id: row.id,
      noiDung: row.noi_dung,
      taoLuc: row.tao_luc,
      author: {
        id: row.nguoi_binh_luan,
        slug: author?.slug ?? "user",
        tenHienThi: author?.tenHienThi ?? "Thành viên",
        avatarId: author?.avatarId ?? null,
      },
    };
  });
}

export async function addThaoLuanComment(params: {
  postId: string;
  authorId: string;
  noiDung: string;
}): Promise<
  | { ok: true; data: CongDongComment }
  | { ok: false; error: string }
> {
  const text = params.noiDung?.trim();
  if (!text) return { ok: false, error: "Nội dung bình luận trống." };
  if (text.length > MAX_COMMENT_LEN) {
    return { ok: false, error: `Bình luận tối đa ${MAX_COMMENT_LEN} ký tự.` };
  }

  const admin = createServiceRoleClient();
  const { data: post } = await admin
    .from("content_thao_luan")
    .select("id, nguoi_dang, id_context, loai_context, da_xoa")
    .eq("id", params.postId)
    .maybeSingle<{
      id: string;
      nguoi_dang: string;
      id_context: string;
      loai_context: string;
      da_xoa: boolean;
    }>();

  if (!post || post.da_xoa) {
    return { ok: false, error: "Bài đăng không tồn tại." };
  }

  if (
    post.loai_context === THAO_LUAN_LOAI_CONTEXT.CONG_DONG &&
    !(await isThanhVien(params.authorId, post.id_context))
  ) {
    return { ok: false, error: "Chỉ thành viên mới được bình luận." };
  }

  const { data: inserted, error } = await admin
    .from("social_binh_luan")
    .insert({
      nguoi_binh_luan: params.authorId,
      loai_doi_tuong: SOCIAL_LOAI_DOI_TUONG.THAO_LUAN,
      id_doi_tuong: params.postId,
      noi_dung: text,
    })
    .select("id, noi_dung, tao_luc, nguoi_binh_luan")
    .single<{
      id: string;
      noi_dung: string;
      tao_luc: string;
      nguoi_binh_luan: string;
    }>();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Không gửi được bình luận." };
  }

  const badges = await loadAuthorBadges([inserted.nguoi_binh_luan]);
  const author = badges.get(inserted.nguoi_binh_luan);

  return {
    ok: true,
    data: {
      id: inserted.id,
      noiDung: inserted.noi_dung,
      taoLuc: inserted.tao_luc,
      author: {
        id: inserted.nguoi_binh_luan,
        slug: author?.slug ?? "user",
        tenHienThi: author?.tenHienThi ?? "Thành viên",
        avatarId: author?.avatarId ?? null,
      },
    },
  };
}
