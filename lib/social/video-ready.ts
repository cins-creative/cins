import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { VideoReadyNotification } from "@/lib/social/types";

export async function notifyVideoReady(params: {
  ownerId: string;
  tacPhamId: string;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id")
    .eq("nguoi_nhan", params.ownerId)
    .eq("loai_doi_tuong", "video_ready")
    .eq("id_doi_tuong", params.tacPhamId)
    .maybeSingle();

  if (existing?.id) return;

  await admin.from("social_thong_bao").insert({
    nguoi_nhan: params.ownerId,
    loai_doi_tuong: "video_ready",
    id_doi_tuong: params.tacPhamId,
  });
}

export async function listVideoReadyNotifications(
  viewerId: string,
): Promise<VideoReadyNotification[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, tao_luc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", "video_ready")
    .order("tao_luc", { ascending: false })
    .limit(10);

  const tacPhamIds = [
    ...new Set(
      (rows ?? [])
        .map((row) => row.id_doi_tuong as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (tacPhamIds.length === 0) return [];

  const { data: posts } = await admin
    .from("content_tac_pham")
    .select("id, slug, tieu_de, id_nguoi_dung")
    .in("id", tacPhamIds)
    .returns<
      Array<{
        id: string;
        slug: string | null;
        tieu_de: string | null;
        id_nguoi_dung: string;
      }>
    >();

  const ownerIds = [...new Set((posts ?? []).map((p) => p.id_nguoi_dung))];
  const { data: owners } = ownerIds.length
    ? await admin
        .from("user_nguoi_dung")
        .select("id, slug")
        .in("id", ownerIds)
        .returns<Array<{ id: string; slug: string }>>()
    : { data: [] };

  const postById = new Map((posts ?? []).map((p) => [p.id, p]));
  const ownerSlugById = new Map((owners ?? []).map((o) => [o.id, o.slug]));

  return (rows ?? [])
    .map((row) => {
      const tacPhamId = row.id_doi_tuong as string | null;
      if (!tacPhamId) return null;
      const post = postById.get(tacPhamId);
      if (!post) return null;
      return {
        notificationId: (row.id as string | null) ?? tacPhamId,
        tacPhamId,
        postSlug: post.slug,
        postTitle: post.tieu_de || "Video mới",
        ownerSlug: ownerSlugById.get(post.id_nguoi_dung) ?? null,
      };
    })
    .filter((item): item is VideoReadyNotification => item !== null);
}
