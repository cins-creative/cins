"use server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import type { MilestonePostAuthor } from "@/lib/journey/milestone-post-types";
import { insertOrgBaiDangComment } from "@/lib/truong/org-bai-dang-comments";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

export type AddOrgBaiDangCommentResult =
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

/** Gửi bình luận lên bài đăng tổ chức — shape khớp `CommentBlock`. */
export async function addOrgBaiDangCommentAction(
  postId: string,
  noiDung: string,
  opts?: {
    replyToId?: string | null;
    anhDinhKem?: string[];
    idToChuc?: string | null;
  },
): Promise<AddOrgBaiDangCommentResult> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, error: "Hệ thống chưa sẵn sàng nhận bình luận." };
  }

  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.id) {
    return { ok: false, error: "Cần đăng nhập để bình luận." };
  }

  const result = await insertOrgBaiDangComment({
    postId,
    idNguoiBinhLuan: session.profile.id,
    noiDung,
    idCha: opts?.replyToId ?? null,
    anhDinhKem: opts?.anhDinhKem,
    idToChuc: opts?.idToChuc,
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  const asOrg = result.asOrg;
  const author: MilestonePostAuthor = {
    id: session.profile.id,
    slug: session.profile.slug,
    tenHienThi: session.profile.ten_hien_thi || session.profile.slug,
    avatarId: session.profile.avatar_id,
    asOrg: asOrg
      ? {
          id: asOrg.id,
          slug: asOrg.slug,
          ten: asOrg.ten,
          loaiToChuc: asOrg.loaiToChuc,
          avatarId: asOrg.avatarId,
          href: asOrg.href,
        }
      : null,
  };

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
