import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type BookmarkBody = {
  loai_doi_tuong?: string;
  id_doi_tuong?: string;
  visibility?: string;
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
  const visibility = body.visibility === "private" ? "private" : "public";
  if (loaiDoiTuong !== "cot_moc" || !idDoiTuong) {
    return NextResponse.json({ error: "Thiếu thông tin bookmark." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
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
