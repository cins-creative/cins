import "server-only";

import { loadAuthorBadges } from "@/lib/cong-dong/author-badges";
import {
  attachFiltersToPost,
  loadFiltersForPosts,
  replaceFiltersOnPost,
  resolveFilterIdsBySlugs,
  validateFilterIdsForOrg,
} from "@/lib/cong-dong/filters";
import {
  FEED_PAGE_SIZE,
  SOCIAL_LOAI_DOI_TUONG,
} from "@/lib/cong-dong/constants";
import { isCongDongAdmin, isThanhVien, loadAuthorOrgRoles } from "@/lib/cong-dong/membership";
import { authorRoleBadgeLabel } from "@/lib/cong-dong/vai-tro";
import { loadViewerBookmarkedMilestones } from "@/lib/cong-dong/post-bookmark";
import { loadTacPhamMirrorsByMilestoneIds } from "@/lib/cong-dong/tac-pham-mirror";
import { loadAuthorOrgPostMetaInOrg } from "@/lib/cong-dong/stats";
import type { CongDongComment, CongDongPost } from "@/lib/cong-dong/types";
import { attachCongDongPersonalFilter } from "@/lib/filter/cong-dong-personal-filter";
import { CHE_DO_MOC_CONG_DONG } from "@/lib/journey/journey-visible-clause";
import {
  parseCommentImageIdsFromRow,
  sanitizeCommentImageIds,
} from "@/lib/social/comments/attachments";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_POST_LEN = 8000;
const MAX_COMMENT_LEN = 2000;
const CF_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CotMocPostRow = {
  id: string;
  id_nguoi_dung: string;
  tieu_de: string;
  mo_ta: string | null;
  ghim: boolean;
  thoi_diem: string;
  tao_luc: string;
};

const COT_MOC_SELECT =
  "id, id_nguoi_dung, tieu_de, mo_ta, ghim, thoi_diem, tao_luc";

const FILTER_JOIN = "cong_dong_filter_gan!inner(id_filter)";

function encodeFeedCursor(row: Pick<CotMocPostRow, "thoi_diem" | "tao_luc">): string {
  return `${row.thoi_diem}|${row.tao_luc}`;
}

function decodeFeedCursor(
  cursor: string,
): { thoiDiem: string; taoLuc: string } | { legacyTaoLuc: string } | null {
  const trimmed = cursor.trim();
  if (!trimmed) return null;
  if (trimmed.includes("|")) {
    const [thoiDiem, taoLuc] = trimmed.split("|");
    if (!thoiDiem || !taoLuc) return null;
    return { thoiDiem, taoLuc };
  }
  return { legacyTaoLuc: trimmed };
}

function cotMocFeedSelect(filterIds: string[] | null): string {
  return filterIds?.length ? `${COT_MOC_SELECT}, ${FILTER_JOIN}` : COT_MOC_SELECT;
}

function applyFeedCursor<Q extends {
  or: (filters: string) => Q;
  lt: (column: string, value: string) => Q;
}>(query: Q, cursor: string): Q {
  const decoded = decodeFeedCursor(cursor);
  if (!decoded) return query;
  if ("legacyTaoLuc" in decoded) {
    return query.lt("tao_luc", decoded.legacyTaoLuc);
  }
  const { thoiDiem, taoLuc } = decoded;
  return query.or(
    `thoi_diem.lt.${thoiDiem},and(thoi_diem.eq.${thoiDiem},tao_luc.lt.${taoLuc})`,
  );
}

async function loadMilestoneMedia(
  milestoneIds: string[],
): Promise<Map<string, CongDongPost["media"]>> {
  const out = new Map<string, CongDongPost["media"]>();
  if (milestoneIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, thu_tu, content_tac_pham(content_media(id, cloudflare_id, thu_tu))",
    )
    .in("id_cot_moc", milestoneIds)
    .order("thu_tu", { ascending: true })
    .returns<
      Array<{
        id_cot_moc: string;
        thu_tu: number;
        content_tac_pham: {
          content_media: Array<{
            id: string;
            cloudflare_id: string | null;
            thu_tu: number;
          }> | null;
        } | null;
      }>
    >();

  for (const link of links ?? []) {
    const mediaRows = link.content_tac_pham?.content_media ?? [];
    for (const media of mediaRows) {
      const cfId = media.cloudflare_id?.trim();
      if (!cfId) continue;
      const list = out.get(link.id_cot_moc) ?? [];
      list.push({
        id: media.id,
        cloudflareId: cfId,
        thuTu: media.thu_tu,
      });
      out.set(link.id_cot_moc, list);
    }
  }

  for (const [, list] of out) {
    list.sort((a, b) => a.thuTu - b.thuTu);
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
    .eq("loai_doi_tuong", SOCIAL_LOAI_DOI_TUONG.COT_MOC)
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
    .eq("loai_doi_tuong", SOCIAL_LOAI_DOI_TUONG.COT_MOC)
    .in("id_doi_tuong", postIds)
    .eq("da_xoa", false)
    .returns<Array<{ id_doi_tuong: string }>>();

  for (const row of rows ?? []) {
    out.set(row.id_doi_tuong, (out.get(row.id_doi_tuong) ?? 0) + 1);
  }
  return out;
}

async function mapPosts(
  rows: CotMocPostRow[],
  orgId: string,
  viewerId: string | null,
): Promise<CongDongPost[]> {
  if (rows.length === 0) return [];
  const postIds = rows.map((r) => r.id);
  const authorIds = rows.map((r) => r.id_nguoi_dung);

  const [
    badges,
    orgRoles,
    mediaByPost,
    reactions,
    commentCounts,
    filtersByPost,
    journeyMirrors,
    authorPostCountsInOrg,
    viewerBookmarkedMilestones,
  ] = await Promise.all([
    loadAuthorBadges(authorIds),
    loadAuthorOrgRoles(orgId, authorIds),
    loadMilestoneMedia(postIds),
    loadReactionMeta(postIds, viewerId),
    loadCommentCounts(postIds),
    loadFiltersForPosts(postIds),
    loadTacPhamMirrorsByMilestoneIds(postIds),
    loadAuthorOrgPostMetaInOrg(orgId, authorIds),
    loadViewerBookmarkedMilestones(postIds, viewerId),
  ]);

  return rows.map((row) => {
    const baseAuthor = badges.get(row.id_nguoi_dung) ?? {
      id: row.id_nguoi_dung,
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
      vaiTroLabel: authorRoleBadgeLabel(orgRoles.get(row.id_nguoi_dung) ?? null),
      soBaiVietTrongNhom:
        authorPostCountsInOrg.get(row.id_nguoi_dung)?.count ?? 0,
    };
    const reaction = reactions.get(row.id) ?? { count: 0, liked: false };
    const journeyMirror = journeyMirrors.get(row.id) ?? null;

    return {
      id: row.id,
      tieuDe: row.tieu_de || null,
      noiDung: row.mo_ta?.trim() ?? "",
      ghim: row.ghim,
      thoiDiem: row.thoi_diem,
      taoLuc: row.tao_luc,
      author,
      media: mediaByPost.get(row.id) ?? [],
      filters: filtersByPost.get(row.id) ?? [],
      journeyMirror,
      likeCount: reaction.count,
      commentCount: commentCounts.get(row.id) ?? 0,
      viewerLiked: reaction.liked,
      viewerBookmarked: viewerBookmarkedMilestones.has(row.id),
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

  let filterIds: string[] | null = null;
  if (filterSlugs.length > 0) {
    const resolved = await resolveFilterIdsBySlugs(params.orgId, filterSlugs);
    if (resolved.length === 0) {
      return { posts: [], nextCursor: null };
    }
    filterIds = resolved;
  }

  let pinnedQuery = admin
    .from("content_cot_moc")
    .select(cotMocFeedSelect(filterIds))
    .eq("id_to_chuc", params.orgId)
    .eq("che_do_hien_thi", CHE_DO_MOC_CONG_DONG)
    .eq("ghim", true)
    .order("thoi_diem", { ascending: false })
    .order("tao_luc", { ascending: false })
    .limit(5);

  if (filterIds?.length) {
    pinnedQuery = pinnedQuery.in("cong_dong_filter_gan.id_filter", filterIds);
  }

  const { data: pinned } = await pinnedQuery.returns<CotMocPostRow[]>();

  let feedQuery = admin
    .from("content_cot_moc")
    .select(cotMocFeedSelect(filterIds))
    .eq("id_to_chuc", params.orgId)
    .eq("che_do_hien_thi", CHE_DO_MOC_CONG_DONG)
    .eq("ghim", false)
    .order("thoi_diem", { ascending: false })
    .order("tao_luc", { ascending: false })
    .limit(limit + 1);

  if (filterIds?.length) {
    feedQuery = feedQuery.in("cong_dong_filter_gan.id_filter", filterIds);
  }

  if (params.cursor) {
    feedQuery = applyFeedCursor(feedQuery, params.cursor);
  }

  const { data: feedRows } = await feedQuery.returns<CotMocPostRow[]>();

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
      ? encodeFeedCursor(pageRows[pageRows.length - 1]!)
      : null;

  return { posts, nextCursor };
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function linkMediaToMilestone(params: {
  milestoneId: string;
  authorId: string;
  cloudflareIds: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ids = params.cloudflareIds.filter((id) => CF_UUID_RE.test(id.trim()));
  if (ids.length === 0) return { ok: true };

  const admin = createServiceRoleClient();
  const { data: tacPham, error: tacErr } = await admin
    .from("content_tac_pham")
    .insert({
      id_nguoi_dung: params.authorId,
      loai_tac_pham: "bai_viet",
      tieu_de: "Ảnh",
      cover_id: ids[0],
      che_do_hien_thi: CHE_DO_MOC_CONG_DONG,
      slug: `cd-${params.milestoneId.slice(0, 8)}`,
      noi_dung_blocks: [],
    })
    .select("id")
    .single<{ id: string }>();

  if (tacErr || !tacPham) {
    return { ok: false, error: tacErr?.message ?? "Không tạo được tác phẩm media." };
  }

  const { error: linkErr } = await admin.from("content_tac_pham_thuoc_moc").insert({
    id_tac_pham: tacPham.id,
    id_cot_moc: params.milestoneId,
    thu_tu: 0,
  });

  if (linkErr) {
    await admin.from("content_tac_pham").delete().eq("id", tacPham.id);
    return { ok: false, error: linkErr.message };
  }

  const mediaRows = ids.map((cloudflare_id, thu_tu) => ({
    id_tac_pham: tacPham.id,
    cloudflare_id: cloudflare_id.trim(),
    loai_media: "anh" as const,
    thu_tu,
  }));

  const { error: mediaErr } = await admin.from("content_media").insert(mediaRows);
  if (mediaErr) {
    await admin.from("content_tac_pham_thuoc_moc").delete().eq("id_cot_moc", params.milestoneId);
    await admin.from("content_tac_pham").delete().eq("id", tacPham.id);
    return { ok: false, error: mediaErr.message };
  }

  return { ok: true };
}

async function linkExistingTacPham(params: {
  milestoneId: string;
  tacPhamId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { error } = await admin.from("content_tac_pham_thuoc_moc").insert({
    id_tac_pham: params.tacPhamId,
    id_cot_moc: params.milestoneId,
    thu_tu: 0,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
  const tieuDe = params.tieuDe?.trim() || "(không tiêu đề)";

  const { data: inserted, error } = await admin
    .from("content_cot_moc")
    .insert({
      id_nguoi_dung: params.authorId,
      id_to_chuc: params.orgId,
      loai_moc: "ca_nhan",
      nguon_goc: "tu_tao",
      tieu_de: tieuDe,
      mo_ta: text,
      thoi_diem: todayIso(),
      che_do_hien_thi: CHE_DO_MOC_CONG_DONG,
    })
    .select(COT_MOC_SELECT)
    .single<CotMocPostRow>();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Không đăng được bài." };
  }

  if (params.idTacPham) {
    const link = await linkExistingTacPham({
      milestoneId: inserted.id,
      tacPhamId: params.idTacPham,
    });
    if (!link.ok) {
      await admin.from("content_cot_moc").delete().eq("id", inserted.id);
      return { ok: false, error: link.error };
    }
  } else if (params.mediaIds?.length) {
    const media = await linkMediaToMilestone({
      milestoneId: inserted.id,
      authorId: params.authorId,
      cloudflareIds: params.mediaIds,
    });
    if (!media.ok) {
      await admin.from("content_cot_moc").delete().eq("id", inserted.id);
      return { ok: false, error: media.error };
    }
  }

  if (filterCheck.ids.length > 0) {
    const linkFilters = await attachFiltersToPost(inserted.id, filterCheck.ids);
    if (!linkFilters.ok) {
      await admin.from("content_cot_moc").delete().eq("id", inserted.id);
      return { ok: false, error: linkFilters.error };
    }
  }

  const labelAttach = await attachCongDongPersonalFilter({
    milestoneId: inserted.id,
    userId: params.authorId,
  });
  if (!labelAttach.ok) {
    await admin.from("content_cot_moc").delete().eq("id", inserted.id);
    return { ok: false, error: labelAttach.error };
  }

  const [post] = await mapPosts([inserted], params.orgId, params.authorId);
  return { ok: true, data: post! };
}

export async function listCongDongPostComments(
  postId: string,
): Promise<CongDongComment[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_binh_luan")
    .select("id, noi_dung, tao_luc, nguoi_binh_luan, anh_dinh_kem")
    .eq("loai_doi_tuong", SOCIAL_LOAI_DOI_TUONG.COT_MOC)
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
        anh_dinh_kem: string[] | null;
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
      anhDinhKem: parseCommentImageIdsFromRow(row.anh_dinh_kem),
      author: {
        id: row.nguoi_binh_luan,
        slug: author?.slug ?? "user",
        tenHienThi: author?.tenHienThi ?? "Thành viên",
        avatarId: author?.avatarId ?? null,
      },
    };
  });
}

/** @deprecated alias — dùng `listCongDongPostComments` */
export const listThaoLuanComments = listCongDongPostComments;

export async function addCongDongPostComment(params: {
  postId: string;
  orgId: string;
  authorId: string;
  noiDung: string;
  anhDinhKem?: string[];
  idCha?: string | null;
}): Promise<
  | { ok: true; data: CongDongComment }
  | { ok: false; error: string }
> {
  const text = params.noiDung?.trim() ?? "";
  const anhDinhKem = sanitizeCommentImageIds(params.anhDinhKem);
  if (!text && anhDinhKem.length === 0) {
    return { ok: false, error: "Nhập nội dung hoặc đính kèm ảnh." };
  }
  if (text.length > MAX_COMMENT_LEN) {
    return { ok: false, error: `Bình luận tối đa ${MAX_COMMENT_LEN} ký tự.` };
  }

  const admin = createServiceRoleClient();
  const { data: post } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, id_to_chuc, che_do_hien_thi")
    .eq("id", params.postId)
    .maybeSingle<{
      id: string;
      id_nguoi_dung: string;
      id_to_chuc: string | null;
      che_do_hien_thi: string;
    }>();

  if (
    !post ||
    post.che_do_hien_thi !== CHE_DO_MOC_CONG_DONG ||
    post.id_to_chuc !== params.orgId
  ) {
    return { ok: false, error: "Bài đăng không tồn tại." };
  }

  if (!(await isThanhVien(params.authorId, params.orgId))) {
    return { ok: false, error: "Chỉ thành viên mới được bình luận." };
  }

  const { data: inserted, error } = await admin
    .from("social_binh_luan")
    .insert({
      nguoi_binh_luan: params.authorId,
      loai_doi_tuong: SOCIAL_LOAI_DOI_TUONG.COT_MOC,
      id_doi_tuong: params.postId,
      noi_dung: text,
      id_cha: params.idCha ?? null,
      anh_dinh_kem: anhDinhKem.length > 0 ? anhDinhKem : null,
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
      anhDinhKem,
      author: {
        id: inserted.nguoi_binh_luan,
        slug: author?.slug ?? "user",
        tenHienThi: author?.tenHienThi ?? "Thành viên",
        avatarId: author?.avatarId ?? null,
      },
    },
  };
}

/** @deprecated alias */
export const addThaoLuanComment = addCongDongPostComment;

async function loadPostForAction(
  postId: string,
  orgId: string,
): Promise<CotMocPostRow | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_cot_moc")
    .select(COT_MOC_SELECT)
    .eq("id", postId)
    .eq("id_to_chuc", orgId)
    .eq("che_do_hien_thi", CHE_DO_MOC_CONG_DONG)
    .maybeSingle<CotMocPostRow>();
  return data;
}

async function assertCanModifyPost(
  viewerId: string,
  orgId: string,
  post: CotMocPostRow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (post.id_nguoi_dung === viewerId) return { ok: true };
  if (await isCongDongAdmin(viewerId, orgId)) return { ok: true };
  return { ok: false, error: "Bạn không có quyền thao tác bài này." };
}

async function milestoneHasTacPham(milestoneId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_cot_moc", { count: "exact", head: true })
    .eq("id_cot_moc", milestoneId);
  return (count ?? 0) > 0;
}

export async function updateCongDongPost(params: {
  orgId: string;
  postId: string;
  actorId: string;
  ghim?: boolean;
  noiDung?: string;
  tieuDe?: string | null;
  filterIds?: string[];
}): Promise<
  | { ok: true; data: CongDongPost }
  | { ok: false; error: string; status?: number }
> {
  const post = await loadPostForAction(params.postId, params.orgId);
  if (!post) {
    return { ok: false, error: "Bài đăng không tồn tại.", status: 404 };
  }

  const access = await assertCanModifyPost(params.actorId, params.orgId, post);
  if (!access.ok) return { ok: false, error: access.error, status: 403 };

  const isModerator = await isCongDongAdmin(params.actorId, params.orgId);
  const isAuthor = post.id_nguoi_dung === params.actorId;

  if (params.ghim !== undefined && !isModerator) {
    return { ok: false, error: "Chỉ quản trị viên mới ghim bài.", status: 403 };
  }

  const hasContentPatch =
    params.noiDung !== undefined ||
    params.tieuDe !== undefined ||
    params.filterIds !== undefined;

  if (hasContentPatch && (await milestoneHasTacPham(params.postId))) {
    return {
      ok: false,
      error: "Bài gắn tác phẩm — sửa trên trang Journey của bạn.",
      status: 400,
    };
  }

  if (hasContentPatch && !isAuthor && !isModerator) {
    return { ok: false, error: "Bạn không có quyền sửa bài này.", status: 403 };
  }

  const admin = createServiceRoleClient();
  const patch: Record<string, unknown> = {};

  if (params.ghim !== undefined) {
    patch.ghim = params.ghim;
  }

  if (params.noiDung !== undefined) {
    const text = params.noiDung.trim();
    if (!text) return { ok: false, error: "Nội dung bài đăng trống." };
    if (text.length > MAX_POST_LEN) {
      return { ok: false, error: `Bài đăng tối đa ${MAX_POST_LEN} ký tự.` };
    }
    patch.mo_ta = text;
  }

  if (params.tieuDe !== undefined) {
    patch.tieu_de = params.tieuDe?.trim() || "(không tiêu đề)";
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin
      .from("content_cot_moc")
      .update(patch)
      .eq("id", params.postId);
    if (error) return { ok: false, error: error.message };
  }

  if (params.filterIds !== undefined) {
    const filterCheck = await validateFilterIdsForOrg(
      params.orgId,
      params.filterIds,
    );
    if (!filterCheck.ok) return { ok: false, error: filterCheck.error };
    const linkFilters = await replaceFiltersOnPost(
      params.postId,
      filterCheck.ids,
    );
    if (!linkFilters.ok) return { ok: false, error: linkFilters.error };
  }

  const updated = await loadPostForAction(params.postId, params.orgId);
  if (!updated) {
    return { ok: false, error: "Không tải lại được bài đăng." };
  }

  const [mapped] = await mapPosts([updated], params.orgId, params.actorId);
  if (!mapped) {
    return { ok: false, error: "Không tải lại được bài đăng." };
  }

  return { ok: true, data: mapped };
}

export async function deleteCongDongPost(params: {
  orgId: string;
  postId: string;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const post = await loadPostForAction(params.postId, params.orgId);
  if (!post) {
    return { ok: false, error: "Bài đăng không tồn tại.", status: 404 };
  }

  const access = await assertCanModifyPost(params.actorId, params.orgId, post);
  if (!access.ok) return { ok: false, error: access.error, status: 403 };

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("content_cot_moc")
    .delete()
    .eq("id", params.postId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
