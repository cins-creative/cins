import "server-only";

import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";
import {
  buildCommentThreads,
  groupReactionsByComment,
} from "@/lib/social/comments/build-tree";
import { parseCommentImageIdsFromRow } from "@/lib/social/comments/attachments";
import { loadCommentIdentityBadges } from "@/lib/social/comments/identity-badges";
import type { CommentAuthor } from "@/lib/social/comments/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type LoaiDoiTuong =
  | "cot_moc"
  | "tac_pham"
  | "du_an"
  | "thao_luan"
  | "article_dong_gop";

type CommentRow = {
  id: string;
  nguoi_binh_luan: string;
  noi_dung: string;
  id_cha: string | null;
  tao_luc: string;
  da_xoa: boolean;
  ghim_luc: string | null;
  anh_dinh_kem: string[] | null;
};

type ProfileRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

export async function fetchCommentsForSocialObject(
  loaiDoiTuong: LoaiDoiTuong,
  idDoiTuong: string,
  viewerId: string | null,
): Promise<MilestonePostComment[]> {
  const admin = createServiceRoleClient();

  const { data: cmtRows } = await admin
    .from("social_binh_luan")
    .select(
      "id, nguoi_binh_luan, noi_dung, id_cha, tao_luc, da_xoa, ghim_luc, anh_dinh_kem",
    )
    .eq("loai_doi_tuong", loaiDoiTuong)
    .eq("id_doi_tuong", idDoiTuong)
    .order("tao_luc", { ascending: true })
    .returns<CommentRow[]>();

  const rows = cmtRows ?? [];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.nguoi_binh_luan))];
  const commentIds = rows.map((r) => r.id);

  const [{ data: profiles }, badges, reactionResult] = await Promise.all([
    admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .in("id", userIds)
      .returns<ProfileRow[]>(),
    loadCommentIdentityBadges(userIds),
    admin
      .from("social_reaction")
      .select("id_doi_tuong, emoji, id_nguoi_dung")
      .eq("loai_doi_tuong", "binh_luan")
      .in("id_doi_tuong", commentIds)
      .returns<Array<{ id_doi_tuong: string; emoji: string; id_nguoi_dung: string }>>(),
  ]);

  const reactionRows = reactionResult.error ? [] : (reactionResult.data ?? []);

  const profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const reactionsByComment = groupReactionsByComment(reactionRows, viewerId);

  const threads = buildCommentThreads(rows, (row, replies) => {
    const p = profileById[row.nguoi_binh_luan];
    const badge = badges.get(row.nguoi_binh_luan) ?? null;
    const author: CommentAuthor | null = p
      ? {
          id: p.id,
          slug: p.slug,
          tenHienThi: p.ten_hien_thi?.trim() || p.slug,
          avatarId: p.avatar_id,
          badge,
        }
      : null;

    const anhDinhKem = row.da_xoa
      ? []
      : parseCommentImageIdsFromRow(row.anh_dinh_kem);

    return {
      id: row.id,
      noiDung: row.da_xoa ? "Bình luận đã xoá" : row.noi_dung,
      taoLuc: row.tao_luc,
      idCha: row.id_cha,
      daXoa: row.da_xoa,
      ghimLuc: row.ghim_luc,
      anhDinhKem,
      author,
      isOwn: viewerId === row.nguoi_binh_luan,
      reactions: reactionsByComment.get(row.id) ?? [],
      replies,
    };
  });

  return threads as MilestonePostComment[];
}
