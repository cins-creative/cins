import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listStudioJobApplicants } from "@/lib/to-chuc/studio-tuyen-dung-applicants";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/studio/tuyen-dung/:id/ung-vien — admin org xem danh sách ứng viên. */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const result = await listStudioJobApplicants(id, session.profile.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ applicants: result.applicants });
}
