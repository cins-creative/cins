import "server-only";

import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import { markEngagementCanTinhLaiForTarget } from "@/lib/cins/feed-scoring-write";
import { normalizeBookmarkPrivateNote } from "@/lib/journey/bookmark-private-note";
import { mapBookmarkUiToCheDoLuu } from "@/lib/journey/bookmark-visibility";
import { isThanhVien } from "@/lib/cong-dong/membership";
import { CHE_DO_MOC_CONG_DONG } from "@/lib/journey/journey-visible-clause";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function resolveMilestoneIdForCongDongPost(
  postId: string,
  orgId: string,
): Promise<
  | { ok: true; milestoneId: string; authorId: string }
  | { ok: false; error: string; status: number }
> {
  const admin = createServiceRoleClient();
  const { data: post } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, id_to_chuc, che_do_hien_thi")
    .eq("id", postId)
    .maybeSingle<{
      id: string;
      id_nguoi_dung: string;
      id_to_chuc: string | null;
      che_do_hien_thi: string;
    }>();

  if (
    !post ||
    post.che_do_hien_thi !== CHE_DO_MOC_CONG_DONG ||
    post.id_to_chuc !== orgId
  ) {
    return { ok: false, error: "Bài đăng không tồn tại.", status: 404 };
  }

  return { ok: true, milestoneId: post.id, authorId: post.id_nguoi_dung };
}

export async function saveCongDongPostBookmark(params: {
  orgId: string;
  postId: string;
  viewerId: string;
  visibility?: string;
  ghiChuRieng?: string | null;
}): Promise<
  | { ok: true; bookmarked: true; count: number; visibility: "public" | "private" }
  | { ok: false; error: string; status: number }
> {
  if (!(await isThanhVien(params.viewerId, params.orgId))) {
    return {
      ok: false,
      error: "Chỉ thành viên cộng đồng mới lưu được bài.",
      status: 403,
    };
  }

  const resolved = await resolveMilestoneIdForCongDongPost(
    params.postId,
    params.orgId,
  );
  if (!resolved.ok) return resolved;

  if (resolved.authorId === params.viewerId) {
    return {
      ok: false,
      error: "Không thể lưu bài viết của chính bạn.",
      status: 400,
    };
  }

  const visibility = mapBookmarkUiToCheDoLuu(params.visibility);
  const ghiChuRieng = normalizeBookmarkPrivateNote(params.ghiChuRieng);
  const admin = createServiceRoleClient();

  await admin
    .from("social_luu")
    .delete()
    .eq("id_nguoi_dung", params.viewerId)
    .eq("loai_doi_tuong", SOCIAL_LOAI_DOI_TUONG.COT_MOC)
    .eq("id_doi_tuong", resolved.milestoneId);

  const { error } = await admin.from("social_luu").upsert(
    {
      id_nguoi_dung: params.viewerId,
      loai_doi_tuong: SOCIAL_LOAI_DOI_TUONG.COT_MOC,
      id_doi_tuong: resolved.milestoneId,
      che_do_hien_thi: visibility,
      ghi_chu_rieng: ghiChuRieng,
    },
    { onConflict: "id_nguoi_dung,loai_doi_tuong,id_doi_tuong" },
  );

  if (error) {
    return { ok: false, error: error.message, status: 400 };
  }

  const { count } = await admin
    .from("social_luu")
    .select("id", { count: "exact", head: true })
    .eq("loai_doi_tuong", SOCIAL_LOAI_DOI_TUONG.COT_MOC)
    .eq("id_doi_tuong", resolved.milestoneId);

  await markEngagementCanTinhLaiForTarget(
    SOCIAL_LOAI_DOI_TUONG.COT_MOC,
    resolved.milestoneId,
  );

  return {
    ok: true,
    bookmarked: true,
    count: count ?? 0,
    visibility,
  };
}

export async function loadViewerBookmarkedMilestones(
  milestoneIds: string[],
  viewerId: string | null,
): Promise<Set<string>> {
  const out = new Set<string>();
  if (!viewerId || milestoneIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_luu")
    .select("id_doi_tuong")
    .eq("id_nguoi_dung", viewerId)
    .eq("loai_doi_tuong", SOCIAL_LOAI_DOI_TUONG.COT_MOC)
    .in("id_doi_tuong", milestoneIds)
    .returns<Array<{ id_doi_tuong: string }>>();

  for (const row of rows ?? []) {
    out.add(row.id_doi_tuong);
  }
  return out;
}
