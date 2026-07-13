import { NextResponse } from "next/server";

import {
  formatTinhThanh,
  getAvatarUrl,
  getGiaiDoanLabel,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ProfileRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  bio: string | null;
  ai_summary_journey: string | null;
  giai_doan: Parameters<typeof getGiaiDoanLabel>[0] | null;
  tinh_thanh: string | null;
  da_xac_minh: boolean | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Thiếu slug." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: profile, error } = await admin
    .from("user_nguoi_dung")
    .select(
      "id, slug, ten_hien_thi, avatar_id, cover_id, bio, ai_summary_journey, giai_doan, tinh_thanh, da_xac_minh",
    )
    .eq("slug", slug)
    .maybeSingle<ProfileRow>();

  if (error || !profile) {
    return NextResponse.json({ error: "Không tìm thấy user." }, { status: 404 });
  }

  const [{ count: cotMoc }, { count: tacPham }, { data: followsFrom }, { data: followsTo }] =
    await Promise.all([
      admin
        .from("content_cot_moc")
        .select("id", { count: "exact", head: true })
        .eq("id_nguoi_dung", profile.id),
      admin
        .from("content_tac_pham")
        .select("id", { count: "exact", head: true })
        .eq("id_nguoi_dung", profile.id),
      admin
        .from("user_theo_doi")
        .select("id_doi_tuong")
        .eq("id_nguoi_theo_doi", profile.id)
        .eq("loai_doi_tuong", "nguoi_dung"),
      admin
        .from("user_theo_doi")
        .select("id_nguoi_theo_doi")
        .eq("id_doi_tuong", profile.id)
        .eq("loai_doi_tuong", "nguoi_dung"),
    ]);

  const following = new Set((followsFrom ?? []).map((row) => row.id_doi_tuong as string));
  const friends = (followsTo ?? []).filter((row) =>
    following.has(row.id_nguoi_theo_doi as string),
  ).length;

  return NextResponse.json({
    profile: {
      idNguoiDung: profile.id,
      slug: profile.slug,
      tenHienThi: profile.ten_hien_thi || profile.slug,
      avatarUrl: getAvatarUrl(profile.avatar_id),
      coverUrl: getProfileCoverUrl(profile.cover_id),
      bio: profile.bio,
      aiSummaryJourney: profile.ai_summary_journey,
      giaiDoan: getGiaiDoanLabel(profile.giai_doan),
      tinhThanh: formatTinhThanh(profile.tinh_thanh),
      daXacMinh: profile.da_xac_minh ?? false,
      stats: {
        cotMoc: cotMoc ?? 0,
        tacPham: tacPham ?? 0,
        banBe: friends,
      },
    },
  });
}
