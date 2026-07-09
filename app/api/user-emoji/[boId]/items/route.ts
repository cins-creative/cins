import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createUserEmojiMuc } from "@/lib/user-emoji/create-muc";

type RouteContext = { params: Promise<{ boId: string }> };

/** POST /api/user-emoji/:boId/items — thêm meme vào bộ (sau upload CF). */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { boId } = await ctx.params;

  let body: { cloudflare_id?: string; ten_goi?: string; thu_tu?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await createUserEmojiMuc({
    boId,
    userId: session.profile.id,
    cloudflareId: body.cloudflare_id ?? "",
    tenGoi: body.ten_goi,
    thuTu: body.thu_tu,
  });

  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, item: result.item });
}
