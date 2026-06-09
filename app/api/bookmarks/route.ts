import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { normalizeBookmarkPrivateNote } from "@/lib/journey/bookmark-private-note";
import { mapBookmarkUiToCheDoLuu } from "@/lib/journey/bookmark-visibility";
import { saveOrgBaiDangBookmark } from "@/lib/truong/org-bai-dang-bookmark";
import { SOCIAL_LOAI_ORG_BAI_DANG } from "@/lib/truong/social-constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type BookmarkBody = {
  loai_doi_tuong?: string;
  id_doi_tuong?: string;
  visibility?: string;
  ghi_chu_rieng?: string | null;
};

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập để lưu bài." }, { status: 401 });
  }

  let body: BookmarkBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const loaiDoiTuong = body.loai_doi_tuong?.trim();
  const idDoiTuong = body.id_doi_tuong?.trim();
  const visibility = mapBookmarkUiToCheDoLuu(body.visibility);
  const ghiChuRieng = normalizeBookmarkPrivateNote(body.ghi_chu_rieng);
  if (!loaiDoiTuong || !idDoiTuong) {
    return NextResponse.json({ error: "Thiếu thông tin bookmark." }, { status: 400 });
  }

  if (loaiDoiTuong === SOCIAL_LOAI_ORG_BAI_DANG) {
    const result = await saveOrgBaiDangBookmark({
      postId: idDoiTuong,
      viewerId: session.profile.id,
      visibility,
      ghiChuRieng,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      ok: true,
      visibility: result.visibility,
      bookmarked: result.bookmarked,
      count: result.count,
    });
  }

  if (loaiDoiTuong !== "cot_moc") {
    return NextResponse.json({ error: "Thiếu thông tin bookmark." }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  const { data: cotMoc, error: cotMocErr } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung")
    .eq("id", idDoiTuong)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();

  if (cotMocErr || !cotMoc) {
    return NextResponse.json({ error: "Cột mốc không tồn tại." }, { status: 404 });
  }

  if (cotMoc.id_nguoi_dung === session.profile.id) {
    return NextResponse.json(
      { error: "Không thể lưu bài viết của chính bạn." },
      { status: 400 },
    );
  }

  await admin
    .from("social_luu")
    .delete()
    .eq("id_nguoi_dung", session.profile.id)
    .eq("loai_doi_tuong", "cot_moc")
    .eq("id_doi_tuong", idDoiTuong);

  const { error } = await admin.from("social_luu").upsert(
    {
      id_nguoi_dung: session.profile.id,
      loai_doi_tuong: "cot_moc",
      id_doi_tuong: idDoiTuong,
      che_do_hien_thi: visibility,
      ghi_chu_rieng: ghiChuRieng,
    },
    { onConflict: "id_nguoi_dung,loai_doi_tuong,id_doi_tuong" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { count } = await admin
    .from("social_luu")
    .select("id", { count: "exact", head: true })
    .eq("loai_doi_tuong", "cot_moc")
    .eq("id_doi_tuong", idDoiTuong);

  return NextResponse.json({ ok: true, visibility, bookmarked: true, count: count ?? 0 });
}
