import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createCongDongOrg } from "@/lib/cong-dong/org-create";

/** POST /api/to-chuc — tạo cộng đồng (org_to_chuc loai cong_dong). */
export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: {
    ten?: string;
    slug?: string;
    mo_ta?: string;
    tinh_thanh?: string;
    avatar_id?: string;
    cover_id?: string;
    che_do?: string;
    loai_to_chuc?: string;
    danh_muc?: string[];
    category_ids?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  if (body.loai_to_chuc && body.loai_to_chuc !== "cong_dong") {
    return NextResponse.json(
      { error: "API này hiện chỉ hỗ trợ loai_to_chuc=cong_dong." },
      { status: 400 },
    );
  }

  const result = await createCongDongOrg(session.profile.id, {
    ten: body.ten ?? "",
    slug: body.slug,
    moTa: body.mo_ta,
    tinhThanh: body.tinh_thanh,
    avatarId: body.avatar_id,
    coverId: body.cover_id,
    cheDo: body.che_do,
    categoryArticleIds: body.danh_muc ?? body.category_ids,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    id: result.data.id,
    slug: result.data.slug,
    redirect: `/cong-dong/${result.data.slug}/nhan`,
  });
}
