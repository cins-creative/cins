import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  addCoAuthor,
  loadCoAuthorsForTacPham,
} from "@/lib/social/co-author";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteCtx = { params: Promise<{ id: string }> };

async function assertTacPhamOwner(
  tacPhamId: string,
  userId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_tac_pham")
    .select("id_nguoi_dung")
    .eq("id", tacPhamId)
    .maybeSingle();
  return data?.id_nguoi_dung === userId;
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const rows = await loadCoAuthorsForTacPham(id);
  return NextResponse.json({ tac_gia: rows });
}

export async function POST(req: Request, ctx: RouteCtx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: tacPhamId } = await ctx.params;
  const isOwner = await assertTacPhamOwner(tacPhamId, session.profile.id);
  if (!isOwner) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  let body: { id_nguoi_dung?: string; vai_tro?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const targetId = body.id_nguoi_dung?.trim();
  const vaiTro = (body.vai_tro ?? "").trim();
  if (!targetId) {
    return NextResponse.json({ error: "Thiếu id_nguoi_dung." }, { status: 400 });
  }

  const result = await addCoAuthor(
    tacPhamId,
    session.profile.id,
    targetId,
    vaiTro,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
