import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { getAvatarUrl } from "@/lib/journey/profile";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

/* GET /api/auth/session-profile — profile tối thiểu cho ghi nhớ tài khoản client. */

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({
      profile: null,
      isCinsAdmin: false,
    });
  }

  const { id, slug, ten_hien_thi, email, avatar_id } = session.profile;
  const isCinsAdmin = await getCurrentUserIsCinsAdmin();
  return NextResponse.json({
    profile: {
      id,
      slug,
      tenHienThi: ten_hien_thi,
      email: email ?? session.email,
      avatarId: avatar_id,
      avatarUrl: getAvatarUrl(avatar_id),
    },
    isCinsAdmin,
  });
}
