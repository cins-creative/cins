import "server-only";

import type {
  MilestonePostComment,
  MilestonePostContent,
  MilestonePostContributor,
  MilestonePostDetail,
} from "@/app/[slug]/journey/actions";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block as ServerBlock } from "@/lib/editor/types";
import { fetchArticleTagsForTacPham } from "@/lib/journey/article-tags-batch";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type PostFetchResult =
  | { ok: true; data: MilestonePostDetail }
  | { ok: false; error: string };

type CotMocDetailRow = {
  id: string;
  id_nguoi_dung: string;
  tieu_de: string;
  mo_ta: string | null;
  thoi_diem: string;
  loai_moc: string;
  che_do_hien_thi: "public" | "theo_nhom" | "chi_minh" | "feature";
};

type TacPhamRow = {
  id: string;
  slug: string | null;
  tieu_de: string;
  mo_ta: string | null;
  cover_id: string | null;
  noi_dung_html: string | null;
  noi_dung_blocks: unknown;
  thu_tu: number;
};

type ProfileRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

type CommentRow = {
  id: string;
  nguoi_binh_luan: string;
  noi_dung: string;
  tao_luc: string;
  da_xoa: boolean;
};

type TacGiaRow = {
  id_tac_pham: string;
  id_nguoi_dung: string;
  vai_tro: string | null;
  la_chu_so_huu: boolean;
  thu_tu: number | null;
};

function parseServerBlocks(raw: unknown): ServerBlock[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  const out: ServerBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.loai !== "string") continue;
    out.push({
      id: typeof obj.id === "string" ? obj.id : `b-${out.length}`,
      loai: obj.loai as ServerBlock["loai"],
      thu_tu: typeof obj.thu_tu === "number" ? obj.thu_tu : out.length,
      config:
        obj.config && typeof obj.config === "object"
          ? (obj.config as Record<string, unknown>)
          : {},
    });
  }
  out.sort((a, b) => a.thu_tu - b.thu_tu);
  return out;
}

async function loadPostContributors(
  admin: ReturnType<typeof createServiceRoleClient>,
  tacPhamIds: string[],
): Promise<Map<string, MilestonePostContributor[]>> {
  const out = new Map<string, MilestonePostContributor[]>();
  if (tacPhamIds.length === 0) return out;

  const { data: rows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham, id_nguoi_dung, vai_tro, la_chu_so_huu, thu_tu")
    .in("id_tac_pham", tacPhamIds)
    .eq("trang_thai", "accepted")
    .order("la_chu_so_huu", { ascending: false })
    .order("thu_tu", { ascending: true })
    .returns<TacGiaRow[]>();

  if (!rows?.length) return out;

  const userIds = [...new Set(rows.map((r) => r.id_nguoi_dung))];
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds)
    .returns<ProfileRow[]>();
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  for (const row of rows) {
    const profile = profileById.get(row.id_nguoi_dung);
    const contributor: MilestonePostContributor = {
      id: row.id_nguoi_dung,
      slug: profile?.slug ?? "",
      tenHienThi: profile?.ten_hien_thi || profile?.slug || "Người dùng",
      avatarId: profile?.avatar_id ?? null,
      vaiTro: row.vai_tro,
      laChuSoHuu: row.la_chu_so_huu,
    };
    const list = out.get(row.id_tac_pham) ?? [];
    list.push(contributor);
    out.set(row.id_tac_pham, list);
  }

  return out;
}

async function fetchMilestoneSocial(
  admin: ReturnType<typeof createServiceRoleClient>,
  milestoneId: string,
  viewerId: string | null,
) {
  const [{ count: likeCount }, { count: bookmarkCount }, { count: commentCount }, viewerLiked, viewerBookmarked] =
    await Promise.all([
      admin
        .from("social_reaction")
        .select("id", { count: "exact", head: true })
        .eq("loai_doi_tuong", "cot_moc")
        .eq("id_doi_tuong", milestoneId)
        .eq("emoji", "heart"),
      admin
        .from("social_luu")
        .select("id", { count: "exact", head: true })
        .eq("loai_doi_tuong", "cot_moc")
        .eq("id_doi_tuong", milestoneId),
      admin
        .from("social_binh_luan")
        .select("id", { count: "exact", head: true })
        .eq("loai_doi_tuong", "cot_moc")
        .eq("id_doi_tuong", milestoneId)
        .is("id_cha", null)
        .eq("da_xoa", false),
      viewerId
        ? admin
            .from("social_reaction")
            .select("id")
            .eq("id_nguoi_dung", viewerId)
            .eq("loai_doi_tuong", "cot_moc")
            .eq("id_doi_tuong", milestoneId)
            .eq("emoji", "heart")
            .maybeSingle()
            .then(({ data }) => Boolean(data))
        : Promise.resolve(false),
      viewerId
        ? admin
            .from("social_luu")
            .select("id")
            .eq("id_nguoi_dung", viewerId)
            .eq("loai_doi_tuong", "cot_moc")
            .eq("id_doi_tuong", milestoneId)
            .maybeSingle()
            .then(({ data }) => Boolean(data))
        : Promise.resolve(false),
    ]);

  return {
    viewerLiked,
    viewerBookmarked,
    likeCount: likeCount ?? 0,
    bookmarkCount: bookmarkCount ?? 0,
    commentCount: commentCount ?? 0,
  };
}

export async function fetchPostComments(
  milestoneId: string,
  viewerId: string | null,
): Promise<MilestonePostComment[]> {
  const admin = createServiceRoleClient();

  const { data: cmtRows } = await admin
    .from("social_binh_luan")
    .select("id, nguoi_binh_luan, noi_dung, tao_luc, da_xoa")
    .eq("loai_doi_tuong", "cot_moc")
    .eq("id_doi_tuong", milestoneId)
    .is("id_cha", null)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: true })
    .returns<CommentRow[]>();

  const commenterIds = Array.from(
    new Set((cmtRows ?? []).map((c) => c.nguoi_binh_luan)),
  );
  let commenters: Record<string, ProfileRow> = {};
  if (commenterIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .in("id", commenterIds)
      .returns<ProfileRow[]>();
    commenters = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  }

  return (cmtRows ?? []).map((c) => {
    const p = commenters[c.nguoi_binh_luan];
    return {
      id: c.id,
      noiDung: c.noi_dung,
      taoLuc: c.tao_luc,
      author: p
        ? {
            id: p.id,
            slug: p.slug,
            tenHienThi: p.ten_hien_thi || p.slug,
            avatarId: p.avatar_id,
          }
        : null,
      isOwn: viewerId === c.nguoi_binh_luan,
    };
  });
}

async function resolvePostMilestoneId(
  ownerSlug: string,
  postSlug: string,
): Promise<
  | { ok: true; milestoneId: string }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();

  const { data: owner, error: ownerErr } = await admin
    .from("user_nguoi_dung")
    .select("id, slug")
    .eq("slug", ownerSlug)
    .maybeSingle<{ id: string; slug: string }>();

  if (ownerErr || !owner) {
    return { ok: false, error: "Người dùng không tồn tại." };
  }

  const { data: tacPham, error: tpErr } = await admin
    .from("content_tac_pham")
    .select("id")
    .eq("id_nguoi_dung", owner.id)
    .eq("slug", postSlug)
    .maybeSingle<{ id: string }>();

  if (tpErr || !tacPham) {
    return { ok: false, error: "Bài viết không tồn tại." };
  }

  const { data: link, error: linkErr } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_cot_moc, thu_tu")
    .eq("id_tac_pham", tacPham.id)
    .order("thu_tu", { ascending: true })
    .limit(1)
    .maybeSingle<{ id_cot_moc: string; thu_tu: number }>();

  if (linkErr || !link) {
    return { ok: false, error: "Bài viết chưa gắn vào cột mốc nào." };
  }

  return { ok: true, milestoneId: link.id_cot_moc };
}

export async function fetchMilestonePostDetail(
  milestoneId: string,
  options?: { includeComments?: boolean },
): Promise<PostFetchResult> {
  if (!milestoneId || typeof milestoneId !== "string") {
    return { ok: false, error: "Thiếu ID cột mốc." };
  }

  const session = await getCurrentSessionAndProfile();
  const viewerId = session?.profile?.id ?? null;
  const admin = createServiceRoleClient();

  const { data: cotMoc, error: cmErr } = await admin
    .from("content_cot_moc")
    .select(
      "id, id_nguoi_dung, tieu_de, mo_ta, thoi_diem, loai_moc, che_do_hien_thi",
    )
    .eq("id", milestoneId)
    .maybeSingle<CotMocDetailRow>();

  if (cmErr || !cotMoc) {
    return { ok: false, error: "Cột mốc không tồn tại hoặc đã bị xoá." };
  }

  const isOwner = viewerId === cotMoc.id_nguoi_dung;
  if (cotMoc.che_do_hien_thi === "chi_minh" && !isOwner) {
    return { ok: false, error: "Cột mốc này đang ở chế độ riêng tư." };
  }

  const includeComments = options?.includeComments ?? true;

  const [ownerResult, linkedResult, comments, social] = await Promise.all([
    admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .eq("id", cotMoc.id_nguoi_dung)
      .maybeSingle<ProfileRow>(),
    admin
      .from("content_tac_pham_thuoc_moc")
      .select(
        "thu_tu, content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, mo_ta, cover_id, noi_dung_html, noi_dung_blocks)",
      )
      .eq("id_cot_moc", milestoneId)
      .order("thu_tu", { ascending: true })
      .returns<
        Array<{
          thu_tu: number;
          content_tac_pham: {
            id: string;
            slug: string | null;
            tieu_de: string;
            mo_ta: string | null;
            cover_id: string | null;
            noi_dung_html: string | null;
            noi_dung_blocks: unknown;
          } | null;
        }>
      >(),
    includeComments
      ? fetchPostComments(milestoneId, viewerId)
      : Promise.resolve([] as MilestonePostComment[]),
    fetchMilestoneSocial(admin, milestoneId, viewerId),
  ]);

  const ownerRow = ownerResult.data;
  const linkedTacPham = linkedResult.data;

  const owner = ownerRow
    ? {
        id: ownerRow.id,
        slug: ownerRow.slug,
        tenHienThi: ownerRow.ten_hien_thi || ownerRow.slug,
        avatarId: ownerRow.avatar_id,
      }
    : {
        id: cotMoc.id_nguoi_dung,
        slug: "user",
        tenHienThi: "Người dùng",
        avatarId: null,
      };

  const tacPhamRows: TacPhamRow[] = (linkedTacPham ?? [])
    .map((row): TacPhamRow | null => {
      const tp = row.content_tac_pham;
      if (!tp) return null;
      return {
        id: tp.id,
        slug: tp.slug,
        tieu_de: tp.tieu_de,
        mo_ta: tp.mo_ta,
        cover_id: tp.cover_id,
        noi_dung_html: tp.noi_dung_html,
        noi_dung_blocks: tp.noi_dung_blocks,
        thu_tu: row.thu_tu,
      };
    })
    .filter((x): x is TacPhamRow => x !== null);

  const tacPhamIds = tacPhamRows.map((t) => t.id);
  const [tagsByTacPham, contributorsByTacPham] = await Promise.all([
    fetchArticleTagsForTacPham(admin, tacPhamIds),
    loadPostContributors(admin, tacPhamIds),
  ]);

  const posts: MilestonePostContent[] = tacPhamRows.map((tp) => ({
    id: tp.id,
    slug: tp.slug ?? "",
    tieuDe: tp.tieu_de,
    moTa: tp.mo_ta,
    noiDungHtml: tp.noi_dung_html,
    noiDungBlocks: parseServerBlocks(tp.noi_dung_blocks),
    coverId: tp.cover_id,
    articleTags: (tagsByTacPham.get(tp.id) ?? []) as ArticleTagRef[],
    contributors: contributorsByTacPham.get(tp.id) ?? [],
  }));

  return {
    ok: true,
    data: {
      milestone: {
        id: cotMoc.id,
        tieuDe: cotMoc.tieu_de,
        moTa: cotMoc.mo_ta,
        thoiDiem: cotMoc.thoi_diem,
        loaiMoc: cotMoc.loai_moc,
        cheDoHienThi: cotMoc.che_do_hien_thi,
      },
      owner,
      posts,
      comments,
      viewerCanComment: !!viewerId,
      viewerIsOwner: isOwner,
      social,
    },
  };
}

export async function fetchPostBySlug(
  ownerSlug: string,
  postSlug: string,
  options?: { includeComments?: boolean },
): Promise<PostFetchResult> {
  if (!ownerSlug || !postSlug) {
    return { ok: false, error: "Thiếu thông tin bài viết." };
  }

  const resolved = await resolvePostMilestoneId(ownerSlug, postSlug);
  if (!resolved.ok) return resolved;

  return fetchMilestonePostDetail(resolved.milestoneId, options);
}

export async function fetchPostPageCore(
  ownerSlug: string,
  postSlug: string,
): Promise<PostFetchResult> {
  return fetchPostBySlug(ownerSlug, postSlug, { includeComments: false });
}

export async function fetchPostCommentsForViewer(
  milestoneId: string,
): Promise<MilestonePostComment[]> {
  const session = await getCurrentSessionAndProfile();
  return fetchPostComments(milestoneId, session?.profile?.id ?? null);
}
