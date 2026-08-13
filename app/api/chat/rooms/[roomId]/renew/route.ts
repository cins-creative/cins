import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createGiaHanVietQrForStudent } from "@/lib/co-so/don-hoc-phi-chat";

type Ctx = { params: Promise<{ roomId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  const userId = session?.profile?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { roomId } = await ctx.params;
  let body: { goiId?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }

  const result = await createGiaHanVietQrForStudent({
    lopRoomId: roomId,
    studentUserId: userId,
    goiId: body.goiId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
