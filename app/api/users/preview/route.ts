import { NextResponse } from "next/server";

import {
  formatTinhThanh,
  getAvatarUrl,
  getGiaiDoanLabel,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { loadUserSocialStatsByIds } from "@/lib/social/follow";
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

  /* Cùng contract friend/search: Gallery (`cotMoc`) · Nổi bật = feature (`tacPham`) · Bạn bè. */
  const statsMap = await loadUserSocialStatsByIds(admin, [profile.id]);
  const stats = statsMap.get(profile.id) ?? {
    cotMoc: 0,
    tacPham: 0,
    banBe: 0,
    toChucXacThuc: 0,
  };

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
        cotMoc: stats.cotMoc,
        tacPham: stats.tacPham,
        banBe: stats.banBe,
      },
    },
  });
}
