import "server-only";

import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";
import { sanitizeCommentImageIds } from "@/lib/social/comments/attachments";
import {
  resolveCommentRootId,
} from "@/lib/social/comments/build-tree";
import { fetchCommentsForSocialObject } from "@/lib/social/comments/fetch-for-object";
import {
  notifyCommentMentions,
  prefixReplyMention,
} from "@/lib/social/comments/mentions";
import { notifyCommentReply } from "@/lib/social/comments/reply-notify";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  canCommentOnDongGop,
  DONG_GOP_COMMENT_LOAI,
  DONG_GOP_COMMENT_MAX_LEN,
} from "./comment-model";
import { fetchDongGopById } from "./fetch";

export {
  canCommentOnDongGop,
  DONG_GOP_COMMENT_LOAI,
  DONG_GOP_COMMENT_MAX_LEN,
};

type CommentRowLite = {
  id: string;
  nguoi_binh_luan: string;
  id_doi_tuong: string;
  id_cha: string | null;
  da_xoa: boolean;
  ghim_luc: string | null;
  noi_dung: string;
};

export async function fetchDongGopCommentCounts(
  dongGopIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (dongGopIds.length === 0) return result;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("social_binh_luan")
    .select("id_doi_tuong")
    .eq("loai_doi_tuong", DONG_GOP_COMMENT_LOAI)
    .in("id_doi_tuong", dongGopIds)
    .eq("da_xoa", false)
    .is("id_cha", null)
    .returns<Array<{ id_doi_tuong: string }>>();

  if (error || !data) return result;

  for (const row of data) {
    result.set(row.id_doi_tuong, (result.get(row.id_doi_tuong) ?? 0) + 1);
  }
  return result;
}

export async function fetchDongGopCommentsByDongGopIds(
  dongGopIds: string[],
  viewerProfileId: string | null,
): Promise<Map<string, MilestonePostComment[]>> {
  const grouped = new Map<string, MilestonePostComment[]>();
  if (dongGopIds.length === 0) return grouped;

  await Promise.all(
    dongGopIds.map(async (id) => {
      const threads = await fetchCommentsForSocialObject(
        DONG_GOP_COMMENT_LOAI,
        id,
        viewerProfileId,
      );
      grouped.set(id, threads);
    }),
  );
  return grouped;
}

export async function insertDongGopComment(input: {
  idDongGop: string;
  idNguoiBinhLuan: string;
  noiDung: string;
  idCha?: string | null;
  anhDinhKem?: string[];
}): Promise<
  | {
      ok: true;
      id: string;
      taoLuc: string;
      noiDung: string;
      idCha: string | null;
      anhDinhKem: string[];
    }
  | { ok: false; message: string }
> {
  let text = input.noiDung.trim();
  const anhDinhKem = sanitizeCommentImageIds(input.anhDinhKem);
  if (!text && anhDinhKem.length === 0) {
    return { ok: false, message: "Nhập nội dung hoặc đính kèm ảnh." };
  }
  if (text.length > DONG_GOP_COMMENT_MAX_LEN) {
    return {
      ok: false,
      message: `Bình luận tối đa ${DONG_GOP_COMMENT_MAX_LEN} ký tự.`,
    };
  }

  const dongGop = await fetchDongGopById(input.idDongGop);
  if (!dongGop || dongGop.da_xoa) {
    return { ok: false, message: "Không tìm thấy bản đóng góp." };
  }
  if (dongGop.trang_thai === "nhap" && !dongGop.hien_thi) {
    if (dongGop.id_nguoi_dong_gop !== input.idNguoiBinhLuan) {
      return { ok: false, message: "Không tìm thấy bản đóng góp." };
    }
  } else if (!dongGop.hien_thi && dongGop.id_nguoi_dong_gop !== input.idNguoiBinhLuan) {
    return { ok: false, message: "Không tìm thấy bản đóng góp." };
  }

  const admin = createServiceRoleClient();
  let idCha: string | null = null;
  let replyTarget: CommentRowLite | null = null;

  if (input.idCha) {
    const { data: target } = await admin
      .from("social_binh_luan")
      .select(
        "id, nguoi_binh_luan, id_doi_tuong, id_cha, da_xoa, ghim_luc, noi_dung",
      )
      .eq("id", input.idCha)
      .maybeSingle<CommentRowLite>();

    if (
      !target ||
      target.da_xoa ||
      target.id_doi_tuong !== input.idDongGop
    ) {
      return { ok: false, message: "Không trả lời được bình luận này." };
    }
    replyTarget = target;

    const { data: allRows } = await admin
      .from("social_binh_luan")
      .select("id, id_cha, nguoi_binh_luan, noi_dung, tao_luc, da_xoa, ghim_luc")
      .eq("loai_doi_tuong", DONG_GOP_COMMENT_LOAI)
      .eq("id_doi_tuong", input.idDongGop)
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

    const byId = new Map((allRows ?? []).map((r) => [r.id, r]));
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
      byId,
    );

    if (input.idCha !== idCha) {
      const replyAuthor = byId.get(input.idCha)?.nguoi_binh_luan;
      const { data: replyProfile } = replyAuthor
        ? await admin
            .from("user_nguoi_dung")
            .select("slug")
            .eq("id", replyAuthor)
            .maybeSingle<{ slug: string }>()
        : { data: null };
      text = prefixReplyMention(text, replyProfile?.slug?.trim());
    }
  }

  const { data, error } = await admin
    .from("social_binh_luan")
    .insert({
      nguoi_binh_luan: input.idNguoiBinhLuan,
      loai_doi_tuong: DONG_GOP_COMMENT_LOAI,
      id_doi_tuong: input.idDongGop,
      noi_dung: text,
      id_cha: idCha,
      anh_dinh_kem: anhDinhKem.length > 0 ? anhDinhKem : null,
    })
    .select("id, tao_luc, noi_dung, id_cha")
    .single<{
      id: string;
      tao_luc: string;
      noi_dung: string;
      id_cha: string | null;
    }>();

  if (error || !data) {
    return { ok: false, message: "Không gửi được bình luận. Thử lại sau." };
  }

  await notifyCommentMentions({
    authorId: input.idNguoiBinhLuan,
    noiDung: data.noi_dung,
    milestoneId: input.idDongGop,
    excludeUserIds: replyTarget ? [replyTarget.nguoi_binh_luan] : undefined,
  });

  if (replyTarget) {
    await notifyCommentReply({
      recipientId: replyTarget.nguoi_binh_luan,
      replierId: input.idNguoiBinhLuan,
      milestoneId: input.idDongGop,
    });
  }

  return {
    ok: true,
    id: data.id,
    taoLuc: data.tao_luc,
    noiDung: data.noi_dung,
    idCha: data.id_cha,
    anhDinhKem,
  };
}
