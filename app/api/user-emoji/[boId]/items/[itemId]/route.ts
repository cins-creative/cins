import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { deleteUserEmojiMuc } from "@/lib/user-emoji/delete-muc";

type RouteContext = { params: Promise<{ boId: string; itemId: string }> };

/** DELETE /api/user-emoji/:boId/items/:itemId */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { boId, itemId } = await ctx.params;
  const result = await deleteUserEmojiMuc({
    boId,
    itemId,
    userId: session.profile.id,
  });

  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
