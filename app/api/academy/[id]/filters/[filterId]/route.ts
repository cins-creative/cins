import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  deleteCoSoOrgFilter,
  updateCoSoOrgFilter,
} from "@/lib/to-chuc/co-so-filters";

type RouteContext = { params: Promise<{ id: string; filterId: string }> };

/** PATCH /api/co-so/:id/filters/:filterId */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, filterId } = await ctx.params;
  let body: { ten?: string; mau?: string; thu_tu?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await updateCoSoOrgFilter({
    orgId,
    filterId,
    adminId: session.profile.id,
    ten: body.ten,
    mau: body.mau,
    thuTu: body.thu_tu,
  });

  if (!result.ok) {
    const status = result.error.includes("admin") || result.error.includes("quyền")
      ? 403
      : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, filter: result.filter });
}

/** DELETE /api/co-so/:id/filters/:filterId */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, filterId } = await ctx.params;
  const result = await deleteCoSoOrgFilter({
    orgId,
    filterId,
    adminId: session.profile.id,
  });

  if (!result.ok) {
    const status = result.error.includes("admin") || result.error.includes("quyền")
      ? 403
      : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
