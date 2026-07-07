import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string; postSlug: string }>;

export const metadata: Metadata = {
  title: "Sửa bài viết · CINS",
  description: "Chỉnh sửa bài viết / cột mốc trên CINs.",
  robots: { index: false, follow: false },
};

type OwnerRow = {
  id: string;
  auth_user_id: string;
  slug: string;
};

/**
 * `/[slug]/p/[postSlug]/edit` — chuyển sang overlay trên Journey (`?edit=`).
 * Giữ route để link cũ / bookmark vẫn hoạt động, không mở trang editor riêng.
 */
export default async function EditPostPage({
  params,
}: {
  params: Params;
}) {
  const { slug, postSlug } = await params;

  const session = await getCurrentSessionAndProfile();
  if (!session) {
    redirect(
      `/login?next=${encodeURIComponent(`/${slug}/p/${postSlug}/edit`)}`,
    );
  }

  const admin = createServiceRoleClient();
  const { data: owner, error: ownerErr } = await admin
    .from("user_nguoi_dung")
    .select("id, auth_user_id, slug")
    .eq("slug", slug)
    .maybeSingle<OwnerRow>();

  if (ownerErr || !owner) notFound();
  if (owner.auth_user_id !== session.authUserId) notFound();

  redirect(`/${slug}?edit=${encodeURIComponent(postSlug)}`);
}
