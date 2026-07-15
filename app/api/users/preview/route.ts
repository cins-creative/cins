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
      "id, slug, ten_hien_thi, avatar_id, cover_id, bio, giai_doan, tinh_thanh, da_xac_minh",
    )
    .eq("slug", slug)
    .maybeSingle<ProfileRow>();

  if (error || !profile) {
    return NextResponse.json({ error: "Không tìm thấy user." }, { status: 404 });
  }

  /* Ban be = ket_ban accepted (head count) — tránh kéo toàn bộ follow edge. */
  const [{ count: cotMoc }, { count: tacPham }, { count: banBe }] =
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
        .from("user_ket_ban")
        .select("id", { count: "exact", head: true })
        .eq("trang_thai", "accepted")
        .or(
          `id_nguoi_gui.eq.${profile.id},id_nguoi_nhan.eq.${profile.id}`,
        ),
    ]);

  return NextResponse.json({
    profile: {
      idNguoiDung: profile.id,
      slug: profile.slug,
      tenHienThi: profile.ten_hien_thi || profile.slug,
      avatarUrl: getAvatarUrl(profile.avatar_id),
      coverUrl: getProfileCoverUrl(profile.cover_id),
      bio: profile.bio,
      giaiDoan: getGiaiDoanLabel(profile.giai_doan),
      tinhThanh: formatTinhThanh(profile.tinh_thanh),
      daXacMinh: profile.da_xac_minh ?? false,
      stats: {
        cotMoc: cotMoc ?? 0,
        tacPham: tacPham ?? 0,
        banBe: banBe ?? 0,
      },
    },
  });
}
