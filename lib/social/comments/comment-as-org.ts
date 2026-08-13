import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAvatarUrl } from "@/lib/journey/profile";
import {
  canCommentAsOrgVaiTro,
  COMMENT_AS_ORG_VAI_TRO,
} from "@/lib/social/comments/vai-tro-label";
import {
  CO_SO_DEFAULT_TAB,
  coSoTabPath,
} from "@/lib/to-chuc/co-so-routes";
import {
  STUDIO_DEFAULT_TAB,
  studioTabPath,
} from "@/lib/to-chuc/studio-routes";
import {
  TRUONG_DEFAULT_TAB,
  truongTabPath,
} from "@/lib/truong/truong-routes";

export { canCommentAsOrgVaiTro, COMMENT_AS_ORG_VAI_TRO };

export type CommentAsOrgIdentity = {
  id: string;
  slug: string;
  ten: string;
  loaiToChuc: string;
  avatarId: string | null;
  avatarUrl: string | null;
  href: string | null;
};

function orgHref(loai: string, slug: string): string | null {
  if (loai === "truong_dai_hoc") return truongTabPath(slug, TRUONG_DEFAULT_TAB);
  if (loai === "co_so_dao_tao") return coSoTabPath(slug, CO_SO_DEFAULT_TAB);
  if (loai === "studio") return studioTabPath(slug, STUDIO_DEFAULT_TAB);
  if (loai === "cong_dong") return `/community/${slug}`;
  if (loai === "doanh_nghiep") return `/doanh-nghiep/${slug}`;
  return null;
}

/**
 * Kiểm tra user là owner/admin active của org → trả identity để hiện trên comment.
 * Không pass → null (coi như bình luận cá nhân).
 */
export async function resolveCommentAsOrgIdentity(params: {
  userId: string;
  orgId: string | null | undefined;
}): Promise<
  | { ok: true; org: CommentAsOrgIdentity | null }
  | { ok: false; error: string }
> {
  const orgId = params.orgId?.trim() || null;
  if (!orgId) return { ok: true, org: null };

  const admin = createServiceRoleClient();
  const { data: membership } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "vai_tro, trang_thai, org_to_chuc: id_to_chuc ( id, slug, ten, loai_to_chuc, avatar_id )",
    )
    .eq("id_nguoi_dung", params.userId)
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "active")
    .is("den_ngay", null)
    .maybeSingle<{
      vai_tro: string;
      trang_thai: string;
      org_to_chuc:
        | {
            id: string;
            slug: string;
            ten: string;
            loai_to_chuc: string;
            avatar_id: string | null;
          }
        | {
            id: string;
            slug: string;
            ten: string;
            loai_to_chuc: string;
            avatar_id: string | null;
          }[]
        | null;
    }>();

  if (!membership) {
    return { ok: false, error: "Bạn không thuộc tổ chức này." };
  }
  if (!canCommentAsOrgVaiTro(membership.vai_tro)) {
    return {
      ok: false,
      error: "Chỉ Admin / Sáng lập mới bình luận dưới danh nghĩa tổ chức.",
    };
  }

  const raw = membership.org_to_chuc;
  const org = Array.isArray(raw) ? raw[0] : raw;
  if (!org?.id || !org.slug) {
    return { ok: false, error: "Không tìm thấy tổ chức." };
  }
  if (org.loai_to_chuc === "cong_dong") {
    return {
      ok: false,
      error: "Không bình luận dưới danh nghĩa cộng đồng.",
    };
  }

  return {
    ok: true,
    org: {
      id: org.id,
      slug: org.slug,
      ten: org.ten,
      loaiToChuc: org.loai_to_chuc,
      avatarId: org.avatar_id,
      avatarUrl: getAvatarUrl(org.avatar_id),
      href: orgHref(org.loai_to_chuc, org.slug),
    },
  };
}

export async function loadCommentAsOrgIdentities(
  orgIds: string[],
): Promise<Map<string, CommentAsOrgIdentity>> {
  const out = new Map<string, CommentAsOrgIdentity>();
  const unique = [...new Set(orgIds.filter(Boolean))];
  if (unique.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, loai_to_chuc, avatar_id")
    .in("id", unique)
    .returns<
      Array<{
        id: string;
        slug: string;
        ten: string;
        loai_to_chuc: string;
        avatar_id: string | null;
      }>
    >();

  for (const org of data ?? []) {
    out.set(org.id, {
      id: org.id,
      slug: org.slug,
      ten: org.ten,
      loaiToChuc: org.loai_to_chuc,
      avatarId: org.avatar_id,
      avatarUrl: getAvatarUrl(org.avatar_id),
      href: orgHref(org.loai_to_chuc, org.slug),
    });
  }
  return out;
}
