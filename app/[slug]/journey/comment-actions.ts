"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/journey/action-result";
import type { MilestonePostAuthor } from "@/lib/journey/milestone-post-types";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { sanitizeCommentImageIds } from "@/lib/social/comments/attachments";
import {
  groupReactionsByComment,
  resolveCommentRootId,
} from "@/lib/social/comments/build-tree";
import {
  notifyCommentMentions,
  prefixReplyMention,
} from "@/lib/social/comments/mentions";
import { notifyCommentReply } from "@/lib/social/comments/reply-notify";
import { COMMENT_REACTION_KEYS } from "@/lib/social/comments/types";
import { markEngagementCanTinhLaiForTarget } from "@/lib/cins/feed-scoring-write";
import { notifyMilestoneComment } from "@/lib/social/follow";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_COMMENT_LEN = 1000;

type CommentRow = {
  id: string;
  nguoi_binh_luan: string;
  loai_doi_tuong: string;
  id_doi_tuong: string;
  id_cha: string | null;
  da_xoa: boolean;
  ghim_luc: string | null;
  noi_dung: string;
};

async function loadCommentRow(
  admin: ReturnType<typeof createServiceRoleClient>,
  commentId: string,
): Promise<CommentRow | null> {
  const { data } = await admin
    .from("social_binh_luan")
    .select(
      "id, nguoi_binh_luan, loai_doi_tuong, id_doi_tuong, id_cha, da_xoa, ghim_luc, noi_dung",
    )
    .eq("id", commentId)
    .maybeSingle<CommentRow>();
  return data ?? null;
}

async function loadMilestoneOwner(
  admin: ReturnType<typeof createServiceRoleClient>,
  milestoneId: string,
): Promise<{ ownerId: string; ownerSlug: string | null; cheDo: string } | null> {
  const { data } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, che_do_hien_thi, user_nguoi_dung: id_nguoi_dung ( slug )")
    .eq("id", milestoneId)
    .maybeSingle<{
      id: string;
      id_nguoi_dung: string;
      che_do_hien_thi: string;
      user_nguoi_dung: { slug: string } | null;
    }>();
  if (!data) return null;
  return {
    ownerId: data.id_nguoi_dung,
    ownerSlug: data.user_nguoi_dung?.slug ?? null,
    cheDo: data.che_do_hien_thi,
  };
}

/** Chủ nội dung của bình luận — cột mốc hoặc bản đóng góp entity. */
async function loadCommentContentOwner(
  admin: ReturnType<typeof createServiceRoleClient>,
  cmt: CommentRow,
): Promise<{ ownerId: string; ownerSlug: string | null } | null> {
  if (cmt.loai_doi_tuong === "article_dong_gop") {
    const { data } = await admin
      .from("article_dong_gop")
      .select(
        "id_nguoi_dong_gop, user_nguoi_dung: id_nguoi_dong_gop ( slug )",
      )
      .eq("id", cmt.id_doi_tuong)
      .maybeSingle<{
        id_nguoi_dong_gop: string;
        user_nguoi_dung: { slug: string } | null;
      }>();
    if (!data) return null;
    return {
      ownerId: data.id_nguoi_dong_gop,
      ownerSlug: data.user_nguoi_dung?.slug ?? null,
    };
  }

  const milestone = await loadMilestoneOwner(admin, cmt.id_doi_tuong);
  if (!milestone) return null;
  return { ownerId: milestone.ownerId, ownerSlug: milestone.ownerSlug };
}

export async function addMilestoneCommentV1(
  milestoneId: string,
  noiDung: string,
  opts?: { replyToId?: string | null; anhDinhKem?: string[] },
): Promise<
  ActionResult<{
    id: string;
    noiDung: string;
    taoLuc: string;
    author: MilestonePostAuthor;
    idCha: string | null;
    anhDinhKem: string[];
  }>
> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }

  let text = (noiDung || "").trim();
  const anhDinhKem = sanitizeCommentImageIds(opts?.anhDinhKem);
  if (!text && anhDinhKem.length === 0) {
    return { ok: false, error: "Nhập nội dung hoặc đính kèm ảnh." };
  }
  if (text.length > MAX_COMMENT_LEN) {
    return { ok: false, error: `Bình luận tối đa ${MAX_COMMENT_LEN} ký tự.` };
  }

  const admin = createServiceRoleClient();
  const milestone = await loadMilestoneOwner(admin, milestoneId);
  if (!milestone) return { ok: false, error: "Cột mốc không tồn tại." };
  if (
    milestone.cheDo === "chi_minh" &&
    milestone.ownerId !== session.profile.id
  ) {
    return { ok: false, error: "Cột mốc đang ở chế độ riêng tư." };
  }

  let idCha: string | null = null;
  if (opts?.replyToId) {
    const target = await loadCommentRow(admin, opts.replyToId);
    if (!target || target.id_doi_tuong !== milestoneId) {
      return { ok: false, error: "Bình luận gốc không hợp lệ." };
    }
    const allRows = await admin
      .from("social_binh_luan")
      .select("id, id_cha, nguoi_binh_luan, noi_dung, tao_luc, da_xoa, ghim_luc")
      .eq("loai_doi_tuong", "cot_moc")
      .eq("id_doi_tuong", milestoneId)
      .returns<
        Array<{
          id: string;
          id_cha: string | null;
          nguoi_binh_luan: string;
          noi_dung: string;
          tao_luc: string;
          da_xoa: boolean;
          ghim_luc: string | null;
        }>
      >();
    const byId = new Map((allRows.data ?? []).map((r) => [r.id, r]));
    idCha = resolveCommentRootId(
      {
        id: target.id,
        nguoi_binh_luan: target.nguoi_binh_luan,
        noi_dung: target.noi_dung,
        id_cha: target.id_cha,
        tao_luc: "",
        da_xoa: target.da_xoa,
        ghim_luc: target.ghim_luc,
      },
      byId as Map<
        string,
        {
          id: string;
          id_cha: string | null;
          nguoi_binh_luan: string;
          noi_dung: string;
          tao_luc: string;
          da_xoa: boolean;
          ghim_luc: string | null;
        }
      >,
    );
    if (opts.replyToId !== idCha) {
      const replyAuthor = byId.get(opts.replyToId)?.nguoi_binh_luan;
      const { data: replyProfile } = replyAuthor
        ? await admin
            .from("user_nguoi_dung")
            .select("ten_hien_thi, slug")
            .eq("id", replyAuthor)
            .maybeSingle<{ ten_hien_thi: string | null; slug: string }>()
        : { data: null };
      text = prefixReplyMention(text, replyProfile?.slug?.trim());
    }
  }

  const { data: inserted, error } = await admin
    .from("social_binh_luan")
    .insert({
      nguoi_binh_luan: session.profile.id,
      loai_doi_tuong: "cot_moc",
      id_doi_tuong: milestoneId,
      noi_dung: text,
      id_cha: idCha,
      anh_dinh_kem: anhDinhKem.length > 0 ? anhDinhKem : null,
    })
    .select("id, tao_luc, noi_dung, id_cha")
    .single<{ id: string; tao_luc: string; noi_dung: string; id_cha: string | null }>();

  if (error || !inserted) {
    return {
      ok: false,
      error: "Không gửi được bình luận: " + (error?.message ?? "unknown"),
    };
  }

  await markEngagementCanTinhLaiForTarget("cot_moc", milestoneId);

  if (milestone.ownerSlug) revalidatePath(`/${milestone.ownerSlug}`);

  const replyTarget = opts?.replyToId
    ? await loadCommentRow(admin, opts.replyToId)
    : null;

  await notifyMilestoneComment({
    ownerId: milestone.ownerId,
    commenterId: session.profile.id,
    commentId: inserted.id,
    milestoneId,
  });
  await notifyCommentMentions({
    authorId: session.profile.id,
    noiDung: inserted.noi_dung,
    milestoneId,
    excludeUserIds: replyTarget
      ? [replyTarget.nguoi_binh_luan]
      : undefined,
  });

  if (replyTarget) {
    await notifyCommentReply({
      recipientId: replyTarget.nguoi_binh_luan,
      replierId: session.profile.id,
      milestoneId,
    });
  }

  return {
    ok: true,
    data: {
      id: inserted.id,
      noiDung: inserted.noi_dung,
      taoLuc: inserted.tao_luc,
      idCha: inserted.id_cha,
      anhDinhKem,
      author: {
        id: session.profile.id,
        slug: session.profile.slug,
        tenHienThi: session.profile.ten_hien_thi || session.profile.slug,
        avatarId: session.profile.avatar_id,
      },
    },
  };
}

export async function hideMilestoneCommentByOwner(
  commentId: string,
): Promise<ActionResult<null>> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }

  const admin = createServiceRoleClient();
  const cmt = await loadCommentRow(admin, commentId);
  if (!cmt) return { ok: false, error: "Bình luận không tồn tại." };

  const owner = await loadCommentContentOwner(admin, cmt);
  if (!owner || owner.ownerId !== session.profile.id) {
    return { ok: false, error: "Bạn không có quyền ẩn bình luận này." };
  }

  const { error } = await admin
    .from("social_binh_luan")
    .update({ da_xoa: true })
    .eq("id", commentId);
  if (error) return { ok: false, error: error.message };

  if (owner.ownerSlug) revalidatePath(`/${owner.ownerSlug}`);
  return { ok: true, data: null };
}

export async function pinMilestoneComment(
  commentId: string,
  pinned: boolean,
): Promise<ActionResult<null>> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }

  const admin = createServiceRoleClient();
  const cmt = await loadCommentRow(admin, commentId);
  if (!cmt) return { ok: false, error: "Bình luận không tồn tại." };
  if (cmt.id_cha) {
    return { ok: false, error: "Chỉ ghim được bình luận gốc." };
  }

  const owner = await loadCommentContentOwner(admin, cmt);
  if (!owner || owner.ownerId !== session.profile.id) {
    return { ok: false, error: "Bạn không có quyền ghim bình luận." };
  }

  if (pinned) {
    await admin
      .from("social_binh_luan")
      .update({ ghim_luc: null })
      .eq("loai_doi_tuong", cmt.loai_doi_tuong)
      .eq("id_doi_tuong", cmt.id_doi_tuong)
      .not("ghim_luc", "is", null);
  }

  const { error } = await admin
    .from("social_binh_luan")
    .update({ ghim_luc: pinned ? new Date().toISOString() : null })
    .eq("id", commentId);
  if (error) return { ok: false, error: error.message };

  if (owner.ownerSlug) revalidatePath(`/${owner.ownerSlug}`);
  return { ok: true, data: null };
}

export async function toggleCommentReaction(
  commentId: string,
  emoji: string,
  active: boolean,
): Promise<ActionResult<{ reactions: { emoji: string; count: number; viewerReacted: boolean }[] }>> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }
  if (!COMMENT_REACTION_KEYS.has(emoji)) {
    return { ok: false, error: "Emoji không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const cmt = await loadCommentRow(admin, commentId);
  if (!cmt || cmt.da_xoa) {
    return { ok: false, error: "Bình luận không tồn tại." };
  }

  if (active) {
    await admin
      .from("social_reaction")
      .delete()
      .eq("id_nguoi_dung", session.profile.id)
      .eq("loai_doi_tuong", "binh_luan")
      .eq("id_doi_tuong", commentId);

    const { error } = await admin.from("social_reaction").insert({
      id_nguoi_dung: session.profile.id,
      loai_doi_tuong: "binh_luan",
      id_doi_tuong: commentId,
      emoji,
    });
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin
      .from("social_reaction")
      .delete()
      .eq("id_nguoi_dung", session.profile.id)
      .eq("loai_doi_tuong", "binh_luan")
      .eq("id_doi_tuong", commentId);
    if (error) return { ok: false, error: error.message };
  }

  const { data: rows } = await admin
    .from("social_reaction")
    .select("emoji, id_nguoi_dung")
    .eq("loai_doi_tuong", "binh_luan")
    .eq("id_doi_tuong", commentId);

  const grouped = groupReactionsByComment(
    (rows ?? []).map((row) => ({
      id_doi_tuong: commentId,
      emoji: row.emoji,
      id_nguoi_dung: row.id_nguoi_dung,
    })),
    session.profile.id,
  );

  return {
    ok: true,
    data: {
      reactions: grouped.get(commentId) ?? [],
    },
  };
}
