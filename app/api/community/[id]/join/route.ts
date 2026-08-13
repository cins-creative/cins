import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getMembershipStatus,
  getViewerVaiTroInOrg,
  joinCongDong,
  leaveCongDong,
} from "@/lib/cong-dong/membership";
import { setOrgFollowLevel } from "@/lib/social/org-notify";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

async function assertCongDongOrg(orgId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle();
  return Boolean(data);
}

/** POST — tham gia / xin tham gia cộng đồng. */
export async function POST(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!(await assertCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  const result = await joinCongDong(session.profile.id, orgId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (result.status === "active") {
    await setOrgFollowLevel(session.profile.id, orgId, "chi_noi_bat");
  }

  const viewerVaiTro =
    result.status === "active"
      ? await getViewerVaiTroInOrg(session.profile.id, orgId)
      : null;

  return NextResponse.json({
    ok: true,
    isThanhVien: result.status === "active",
    joinPending: result.status === "pending",
    viewerVaiTro,
  });
}

/** DELETE — rời cộng đồng hoặc huỷ yêu cầu đang chờ (không xoá admin/owner). */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!(await assertCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  const before = await getMembershipStatus(session.profile.id, orgId);
  const result = await leaveCongDong(session.profile.id, orgId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    isThanhVien: false,
    joinPending: false,
    viewerVaiTro: null,
    cancelledPending: before === "pending",
  });
}
