import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { updateCongDongBranding } from "@/lib/cong-dong/org-profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

async function getCongDongOrg(orgId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ id: string }>();
  return data;
}

/** PATCH /api/cong-dong/:id/profile — admin cập nhật avatar_id / cover_id */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  let body: {
    avatarId?: string | null;
    avatar_id?: string | null;
    coverId?: string | null;
    cover_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const avatarId =
    body.avatarId !== undefined ? body.avatarId : body.avatar_id;
  const coverId = body.coverId !== undefined ? body.coverId : body.cover_id;

  if (avatarId === undefined && coverId === undefined) {
    return NextResponse.json(
      { error: "Cần avatarId hoặc coverId." },
      { status: 400 },
    );
  }

  const result = await updateCongDongBranding({
    orgId,
    adminId: session.profile.id,
    avatarId,
    coverId,
  });

  if (!result.ok) {
    const status = result.error.includes("admin") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    avatarId: result.avatarId,
    coverId: result.coverId,
  });
}
