import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { deleteUserEmojiBo } from "@/lib/user-emoji/delete-bo";
import { updateUserEmojiBo } from "@/lib/user-emoji/update-bo";

type RouteContext = { params: Promise<{ boId: string }> };

/** PATCH /api/user-emoji/:boId */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { boId } = await ctx.params;

  let body: { ten?: string; thu_tu?: number; cloudflare_id_anh_bia?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await updateUserEmojiBo({
    boId,
    userId: session.profile.id,
    ten: body.ten,
    thuTu: body.thu_tu,
    cloudflareIdAnhBia: body.cloudflare_id_anh_bia,
  });

  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, bo: result.bo });
}

/** DELETE /api/user-emoji/:boId */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { boId } = await ctx.params;
  const result = await deleteUserEmojiBo({
    boId,
    userId: session.profile.id,
  });

  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
