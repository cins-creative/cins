"use server";

import { revalidatePath } from "next/cache";

import { fetchDongGopById } from "@/lib/article/dong-gop/fetch";
import { insertDongGopComment } from "@/lib/article/dong-gop/comments";
import { articlePublicHref } from "@/lib/articles/article-href";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import type { MilestonePostAuthor } from "@/lib/journey/milestone-post-types";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

async function revalidateEntityByDongGop(idDongGop: string) {
  const row = await fetchDongGopById(idDongGop);
  if (!row) return;

  const admin = createServiceRoleClient();
  const { data: article } = await admin
    .from("article_bai_viet")
    .select("slug, loai_bai_viet")
    .eq("id", row.id_bai_viet)
    .maybeSingle<{ slug: string; loai_bai_viet: string }>();

  if (article?.slug) {
    revalidatePath(articlePublicHref(article.loai_bai_viet, article.slug));
  }
}

export type AddContributionCommentResult =
  | {
      ok: true;
      data: {
        id: string;
        noiDung: string;
        taoLuc: string;
        author: MilestonePostAuthor;
        idCha: string | null;
        anhDinhKem: string[];
      };
    }
  | { ok: false; error: string };

/** Gửi bình luận — shape khớp CommentBlock / Journey. */
export async function addContributionCommentAction(
  idDongGop: string,
  noiDung: string,
  opts?: { replyToId?: string | null; anhDinhKem?: string[] },
): Promise<AddContributionCommentResult> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, error: "Hệ thống chưa sẵn sàng nhận bình luận." };
  }

  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.id) {
    return { ok: false, error: "Cần đăng nhập để bình luận." };
  }

  const author: MilestonePostAuthor = {
    id: session.profile.id,
    slug: session.profile.slug,
    tenHienThi: session.profile.ten_hien_thi || session.profile.slug,
    avatarId: session.profile.avatar_id,
  };

  const result = await insertDongGopComment({
    idDongGop,
    idNguoiBinhLuan: session.profile.id,
    noiDung,
    idCha: opts?.replyToId ?? null,
    anhDinhKem: opts?.anhDinhKem,
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  await revalidateEntityByDongGop(idDongGop);

  return {
    ok: true,
    data: {
      id: result.id,
      noiDung: result.noiDung,
      taoLuc: result.taoLuc,
      idCha: result.idCha,
      anhDinhKem: result.anhDinhKem,
      author,
    },
  };
}
