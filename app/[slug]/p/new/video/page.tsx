import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { MediaComposeView } from "@/components/editor/MediaComposeView";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import "../editor.css";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export const metadata: Metadata = {
  title: "Thêm video · CINS",
  description: "Đăng video lên Journey trên CINs.",
  robots: { index: false, follow: false },
};

export default async function NewVideoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const session = await getCurrentSessionAndProfile();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/${slug}/p/new/video`)}`);
  }

  const admin = createServiceRoleClient();
  const { data: owner, error } = await admin
    .from("user_nguoi_dung")
    .select("id, auth_user_id, slug, ten_hien_thi, avatar_id")
    .eq("slug", slug)
    .maybeSingle<{
      id: string;
      auth_user_id: string;
      slug: string;
      ten_hien_thi: string | null;
      avatar_id: string | null;
    }>();

  if (error || !owner) notFound();
  if (owner.auth_user_id !== session.authUserId) notFound();

  return (
    <MediaComposeView
      mode="video"
      ownerId={owner.id}
      ownerSlug={owner.slug}
      ownerName={owner.ten_hien_thi || `@${owner.slug}`}
      ownerAvatarId={owner.avatar_id}
      autoOpenFilePicker
    />
  );
}
