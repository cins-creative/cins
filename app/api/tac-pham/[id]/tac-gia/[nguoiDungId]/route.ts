import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadCoAuthorCreditsForTacPham } from "@/lib/journey/coauthor-credits";
import { removeCoAuthor, respondCoAuthor } from "@/lib/social/co-author";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteCtx = { params: Promise<{ id: string; nguoiDungId: string }> };

async function getTacPhamOwnerId(tacPhamId: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_tac_pham")
    .select("id_nguoi_dung")
    .eq("id", tacPhamId)
    .maybeSingle();
  return (data?.id_nguoi_dung as string) ?? null;
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: tacPhamId, nguoiDungId } = await ctx.params;
  if (session.profile.id !== nguoiDungId) {
    return NextResponse.json({ error: "Chỉ người được tag mới phản hồi." }, { status: 403 });
  }

  let body: { trang_thai?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const trangThai = body.trang_thai;
  if (trangThai !== "accepted" && trangThai !== "declined") {
    return NextResponse.json(
      { error: "trang_thai phải là accepted hoặc declined." },
      { status: 400 },
    );
  }

  const result = await respondCoAuthor(tacPhamId, nguoiDungId, trangThai);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const ownerId = await getTacPhamOwnerId(tacPhamId);
  const admin = createServiceRoleClient();
  if (ownerId) {
    const { data: owner } = await admin
      .from("user_nguoi_dung")
      .select("slug")
      .eq("id", ownerId)
      .maybeSingle();
    if (owner?.slug) revalidatePath(`/${owner.slug}`);
  }
  const { data: invitee } = await admin
    .from("user_nguoi_dung")
    .select("slug")
    .eq("id", nguoiDungId)
    .maybeSingle();
  if (invitee?.slug) revalidatePath(`/${invitee.slug}`);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: tacPhamId, nguoiDungId } = await ctx.params;
  const ownerId = await getTacPhamOwnerId(tacPhamId);
  if (!ownerId) {
    return NextResponse.json({ error: "Không tìm thấy tác phẩm." }, { status: 404 });
  }

  const result = await removeCoAuthor(
    tacPhamId,
    nguoiDungId,
    session.profile.id,
    ownerId,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  const coAuthorCredits = await loadCoAuthorCreditsForTacPham(tacPhamId);
  return NextResponse.json({ ok: true, tacPhamId, coAuthorCredits });
}
