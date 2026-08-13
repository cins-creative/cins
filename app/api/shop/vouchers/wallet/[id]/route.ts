import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { goVoucherVi } from "@/lib/shop/voucher";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/shop/voucher/vi/[id] — gỡ khỏi ví. */
export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await goVoucherVi(session.profile.id, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không gỡ được." }, { status: 500 });
  }
}
