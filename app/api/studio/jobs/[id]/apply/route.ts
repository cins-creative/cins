import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { applyToStudioJob } from "@/lib/to-chuc/studio-tuyen-dung-mutations";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/studio/tuyen-dung/:id/ung-tuyen — ứng tuyển (người dùng đã đăng nhập). */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: { thuNgo?: string | null } = {};
  try {
    body = (await req.json()) as { thuNgo?: string | null };
  } catch {
    body = {};
  }

  const result = await applyToStudioJob(id, session.profile.id, body.thuNgo ?? null);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
