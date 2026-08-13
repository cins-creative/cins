import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadCoAuthorCreditsForTacPham } from "@/lib/journey/coauthor-credits";
import {
  removeCoAuthor,
  respondCoAuthor,
  updateOwnCoAuthorPositions,
} from "@/lib/social/co-author";
import {
  respondOrgBaiDangCoAuthor,
  updateOwnOrgBaiDangCoAuthorPositions,
} from "@/lib/truong/org-bai-dang-coauthor";
import { MAX_COAUTHOR_POSITIONS } from "@/lib/social/vai-tro";
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

  let body: {
    action?: string;
    trang_thai?: string;
    vai_tro?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  let viTri: string[] | undefined;
  if (body.vai_tro !== undefined) {
    if (
      !Array.isArray(body.vai_tro) ||
      body.vai_tro.some((v) => typeof v !== "string")
    ) {
      return NextResponse.json(
        { error: "vai_tro phải là mảng chuỗi." },
        { status: 400 },
      );
    }
    viTri = (body.vai_tro as string[]).map((v) => v.trim()).filter(Boolean);
    if (viTri.length > MAX_COAUTHOR_POSITIONS) {
      return NextResponse.json(
        { error: `Tối đa ${MAX_COAUTHOR_POSITIONS} vị trí công việc.` },
        { status: 400 },
      );
    }
  }

  if (body.action === "update_role") {
    if (!viTri?.length) {
      return NextResponse.json(
        { error: "Chọn ít nhất một vị trí công việc." },
        { status: 400 },
      );
    }

    let result = await updateOwnCoAuthorPositions(
      tacPhamId,
      nguoiDungId,
      viTri,
    );
    if (!result.ok && result.error.includes("Không tìm thấy")) {
      result = await updateOwnOrgBaiDangCoAuthorPositions(
        tacPhamId,
        nguoiDungId,
        viTri,
      );
    }
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const admin = createServiceRoleClient();
    const ownerId = await getTacPhamOwnerId(tacPhamId);
    if (ownerId) {
      const { data: owner } = await admin
        .from("user_nguoi_dung")
        .select("slug")
        .eq("id", ownerId)
        .maybeSingle();
      if (owner?.slug) revalidatePath(`/${owner.slug}`);
    }
    const { data: profile } = await admin
      .from("user_nguoi_dung")
      .select("slug")
      .eq("id", nguoiDungId)
      .maybeSingle();
    if (profile?.slug) revalidatePath(`/${profile.slug}`);

    return NextResponse.json({ ok: true, vai_tro: viTri });
  }

  const trangThai = body.trang_thai;
  if (trangThai !== "accepted" && trangThai !== "declined") {
    return NextResponse.json(
      { error: "trang_thai phải là accepted hoặc declined." },
      { status: 400 },
    );
  }

  let result = await respondCoAuthor(tacPhamId, nguoiDungId, trangThai, viTri);
  if (!result.ok && result.error.includes("Không tìm thấy")) {
    result = await respondOrgBaiDangCoAuthor(
      tacPhamId,
      nguoiDungId,
      trangThai,
      viTri,
    );
  }
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
