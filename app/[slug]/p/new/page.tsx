import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EditorView } from "@/components/editor/EditorView";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import "./editor.css";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export const metadata: Metadata = {
  title: "Tạo bài viết · CINS",
  description: "Trình tạo bài viết / cột mốc Journey trên CINs.",
  robots: { index: false, follow: false },
};

/**
 * Trình tạo bài viết — `/[slug]/p/new`.
 *
 * Owner-only: chỉ user có slug khớp URL mới render. Khác → 404 (không leak
 * profile khác). Middleware đã đảm bảo phải có session (xem `middleware.ts`
 * `isProtectedPath`).
 *
 * Lượt này KHÔNG persist xuống DB — UI skeleton để xem layout & flow theo
 * brief `docs/cins-editor brief`. Nút "Đăng" hiện toast stub; lượt sau sẽ
 * wire `content_tac_pham` + `content_cot_moc` + sanitize HTML server-side.
 */
export default async function NewPostPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;

  const session = await getCurrentSessionAndProfile();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/${slug}/p/new`)}`);
  }

  /* Verify slug thuộc về user hiện tại (chỉ owner mới tạo bài). */
  const admin = createServiceRoleClient();
  const { data: owner, error } = await admin
    .from("user_nguoi_dung")
    .select("auth_user_id, slug, ten_hien_thi")
    .eq("slug", slug)
    .maybeSingle<{
      auth_user_id: string;
      slug: string;
      ten_hien_thi: string | null;
    }>();

  if (error || !owner) notFound();
  if (owner.auth_user_id !== session.authUserId) notFound();

  return (
    <EditorView
      ownerSlug={owner.slug}
      ownerName={owner.ten_hien_thi || `@${owner.slug}`}
    />
  );
}
