import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { isThanhVien } from "@/lib/cong-dong/membership";
import {
  getOrgFollowSettings,
  setOrgFollowLevel,
  type OrgNotifyLevel,
} from "@/lib/social/org-notify";
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

function parseNotifyLevel(raw: unknown): OrgNotifyLevel | null {
  if (raw === "tat_ca" || raw === "chi_noi_bat" || raw === "tat") return raw;
  return null;
}

/** GET — mức thông báo org hiện tại. */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!(await assertCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  if (!(await isThanhVien(session.profile.id, orgId))) {
    return NextResponse.json({ error: "Chỉ thành viên mới đặt thông báo." }, { status: 403 });
  }

  const settings = await getOrgFollowSettings(session.profile.id, orgId);
  return NextResponse.json(settings);
}

/** PATCH — đổi mức thông báo org. */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!(await assertCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  if (!(await isThanhVien(session.profile.id, orgId))) {
    return NextResponse.json({ error: "Chỉ thành viên mới đặt thông báo." }, { status: 403 });
  }

  let body: { muc_thong_bao?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const mucThongBao = parseNotifyLevel(body.muc_thong_bao);
  if (!mucThongBao) {
    return NextResponse.json(
      { error: "muc_thong_bao phải là tat_ca, chi_noi_bat hoặc tat." },
      { status: 400 },
    );
  }

  const result = await setOrgFollowLevel(session.profile.id, orgId, mucThongBao);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const settings = await getOrgFollowSettings(session.profile.id, orgId);
  return NextResponse.json(settings);
}
