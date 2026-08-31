import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  formatTinhThanh,
  getAvatarUrl,
  getGiaiDoanLabel,
  getProfileCoverUrl,
  normalizeSocialLinks,
} from "@/lib/journey/profile";
import { popoverThemeDtoFromGiaoDien } from "@/lib/journey/popover-theme";
import { avatarFrameFromGiaoDien } from "@/lib/journey/avatar-frame";
import {
  isDefaultProfileTheme,
  overlayDimFromUi,
  parseProfileGiaoDien,
  profileThemeImageUrl,
  resolveAccentHex,
  resolveDeviceImageId,
} from "@/lib/journey/profile-theme";
import { loadUserSocialStatsByIds } from "@/lib/social/follow";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ProfileRow = {
  id: string;
  auth_user_id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  bio: string | null;
  giai_doan: Parameters<typeof getGiaiDoanLabel>[0] | null;
  tinh_thanh: string | null;
  da_xac_minh: boolean | null;
  email_lien_he: string | null;
  visibility_email: string | null;
  mxh_links: unknown;
  giao_dien: unknown;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Thiếu slug." }, { status: 400 });
  }

  const [session, admin] = await Promise.all([
    getCurrentSessionAndProfile().catch(() => null),
    Promise.resolve(createServiceRoleClient()),
  ]);

  const { data: profile, error } = await admin
    .from("user_nguoi_dung")
    .select(
      "id, auth_user_id, slug, ten_hien_thi, avatar_id, cover_id, bio, giai_doan, tinh_thanh, da_xac_minh, email_lien_he, visibility_email, mxh_links, giao_dien",
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

  /* Follower count — chỉ cho preview card (không phình batch stats toàn sàn). */
  const { count: theoDoiCount } = await admin
    .from("user_theo_doi")
    .select("id_nguoi_theo_doi", { count: "exact", head: true })
    .eq("loai_doi_tuong", "nguoi_dung")
    .eq("id_doi_tuong", profile.id);

  const popoverTheme = popoverThemeDtoFromGiaoDien(
    profile.giao_dien,
    profile.slug,
  );
  const avatarFrame = avatarFrameFromGiaoDien(profile.giao_dien);

  const isOwner = session
    ? session.profile?.id === profile.id ||
      session.authUserId === profile.auth_user_id
    : false;
  const emailPublic = profile.visibility_email === "public";
  const emailLienHe =
    isOwner || emailPublic ? profile.email_lien_he?.trim() || null : null;
  const mxhLinks = normalizeSocialLinks(profile.mxh_links).map((l) => ({
    label: l.label,
    url: l.url,
  }));

  const giaoDien = parseProfileGiaoDien(profile.giao_dien);
  const hasCustomTheme = !isDefaultProfileTheme(giaoDien);
  const accentHex = resolveAccentHex(giaoDien.theme);
  let bgImageUrl: string | null = null;
  let bgDim = 0;
  const bg = giaoDien.theme.background;
  if (bg.kind === "image") {
    const phoneId = resolveDeviceImageId(bg, "phone");
    if (phoneId) bgImageUrl = profileThemeImageUrl(phoneId, "public");
    bgDim = overlayDimFromUi(bg.dim);
  } else if (bg.kind === "pattern" && bg.patternId !== "none") {
    bgDim = overlayDimFromUi(bg.dim);
  }
  const profilePageTheme = hasCustomTheme
    ? { accentHex, hasCustomTheme: true, bgImageUrl, bgDim }
    : null;

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
      emailLienHe,
      mxhLinks,
      stats: {
        cotMoc: stats.cotMoc,
        tacPham: stats.tacPham,
        banBe: stats.banBe,
        theoDoi: theoDoiCount ?? 0,
        toChucXacThuc: stats.toChucXacThuc,
      },
      ...(popoverTheme ? { popoverTheme } : {}),
      ...(avatarFrame ? { avatarFrame } : {}),
      ...(profilePageTheme ? { profilePageTheme } : {}),
    },
  });
}
