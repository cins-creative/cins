import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { setLopChatAvatar } from "@/lib/co-so/lop-chat-phong";
import { getAvatarUrl } from "@/lib/journey/profile";

type Ctx = { params: Promise<{ id: string; lopId: string }> };

/** PATCH /api/co-so/:id/lop-hoc/:lopId/avatar — thumbnail phòng lớp (= chat). */
export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, lopId } = await ctx.params;
  if (!orgId?.trim() || !lopId?.trim()) {
    return NextResponse.json({ error: "Thiếu tham số." }, { status: 400 });
  }

  let body: { avatarId?: string | null; avatar_id?: string | null };
  try {
    body = (await req.json()) as {
      avatarId?: string | null;
      avatar_id?: string | null;
    };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const avatarId =
    body.avatarId !== undefined ? body.avatarId : (body.avatar_id ?? null);

  const result = await setLopChatAvatar({
    orgId: orgId.trim(),
    lopId: lopId.trim(),
    actorId: session.profile.id,
    avatarId,
  });

  if (!result.ok) {
    const status =
      result.error.includes("quyền") || result.error.includes("Forbidden")
        ? 403
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    roomId: result.roomId,
    avatarId: result.avatarId,
    avatarUrl: getAvatarUrl(result.avatarId),
  });
}
