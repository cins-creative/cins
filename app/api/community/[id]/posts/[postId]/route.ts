import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { deleteCongDongPost, updateCongDongPost } from "@/lib/cong-dong/posts";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string; postId: string }> };

async function getCongDongOrg(orgId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, loai_to_chuc")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ id: string; loai_to_chuc: string }>();
  return data;
}

/** PATCH /api/cong-dong/:id/posts/:postId */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, postId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  let body: {
    ghim?: boolean;
    noi_dung?: string;
    tieu_de?: string | null;
    filter_ids?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await updateCongDongPost({
    orgId,
    postId,
    actorId: session.profile.id,
    ghim: body.ghim,
    noiDung: body.noi_dung,
    tieuDe: body.tieu_de,
    filterIds: Array.isArray(body.filter_ids) ? body.filter_ids : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 },
    );
  }

  return NextResponse.json({ ok: true, post: result.data });
}

/** DELETE /api/cong-dong/:id/posts/:postId — soft delete khỏi feed. */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, postId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  const result = await deleteCongDongPost({
    orgId,
    postId,
    actorId: session.profile.id,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
