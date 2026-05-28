import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ReactionBody = {
  loai_doi_tuong?: string;
  id_doi_tuong?: string;
  emoji?: string;
  active?: boolean;
};

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập để thích bài." }, { status: 401 });
  }

  let body: ReactionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const loaiDoiTuong = body.loai_doi_tuong?.trim();
  const idDoiTuong = body.id_doi_tuong?.trim();
  const emoji = body.emoji?.trim() || "heart";
  if (loaiDoiTuong !== "cot_moc" || !idDoiTuong || emoji !== "heart") {
    return NextResponse.json({ error: "Thông tin reaction không hợp lệ." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (body.active) {
    const { error } = await admin.from("social_reaction").upsert(
      {
        id_nguoi_dung: session.profile.id,
        loai_doi_tuong: loaiDoiTuong,
        id_doi_tuong: idDoiTuong,
        emoji,
      },
      { onConflict: "id_nguoi_dung,loai_doi_tuong,id_doi_tuong,emoji" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await admin
      .from("social_reaction")
      .delete()
      .eq("id_nguoi_dung", session.profile.id)
      .eq("loai_doi_tuong", loaiDoiTuong)
      .eq("id_doi_tuong", idDoiTuong)
      .eq("emoji", emoji);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { count } = await admin
    .from("social_reaction")
    .select("id", { count: "exact", head: true })
    .eq("loai_doi_tuong", loaiDoiTuong)
    .eq("id_doi_tuong", idDoiTuong)
    .eq("emoji", emoji);

  return NextResponse.json({ ok: true, liked: Boolean(body.active), count: count ?? 0 });
}
