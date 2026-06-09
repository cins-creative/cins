import "server-only";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

function bearerMatchesInlineToken(request: Request): boolean {
  const token = process.env.ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN;
  if (!token) return false;
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return Boolean(bearer && bearer === token);
}

/**
 * Gate ghi API inline trường ĐH:
 * - Production: session + org admin (hoặc CINs admin).
 * - Dev / nội bộ: fallback Bearer token khi `CINS_INLINE_ARTICLE_EDIT` bật.
 */
export async function assertTruongOrgWriteApi(
  request: Request,
  orgId: string,
): Promise<Response | null> {
  const orgIdTrim = orgId?.trim();
  if (!orgIdTrim) {
    return Response.json({ error: "Invalid org id" }, { status: 400 });
  }

  if (!hasServiceRoleEnv()) {
    return Response.json(
      { error: "Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  const session = await getCurrentSessionAndProfile();
  if (session?.profile?.id) {
    if (await isTruongOrgAdmin(orgIdTrim, session.profile.id)) {
      return null;
    }
    return Response.json(
      { error: "Bạn không có quyền quản trị trang trường này." },
      { status: 403 },
    );
  }

  if (isInlineArticleEditEnabled() && bearerMatchesInlineToken(request)) {
    return null;
  }

  if (isInlineArticleEditEnabled()) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ error: "Cần đăng nhập." }, { status: 401 });
}
