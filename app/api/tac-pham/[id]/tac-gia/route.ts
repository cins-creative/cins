import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import type { CoAuthorDraft } from "@/lib/social/types";
import {
  addCoAuthor,
  loadCoAuthorsForTacPham,
  proposeCoAuthorFromCollaborator,
  syncCoAuthorsFromEditor,
} from "@/lib/social/co-author";
import { loadCoAuthorCreditsForTacPham } from "@/lib/journey/coauthor-credits";
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

  const result = isOwner
    ? await addCoAuthor(tacPhamId, session.profile.id, targetId, vaiTro)
    : await proposeCoAuthorFromCollaborator(
        tacPhamId,
        session.profile.id,
        targetId,
        vaiTro,
      );
  if (!result.ok) {
    const status = result.error.includes("kết bạn") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  const coAuthorCredits = isOwner
    ? await loadCoAuthorCreditsForTacPham(tacPhamId)
    : undefined;
  return NextResponse.json({
    ok: true,
    reviewRequired: !isOwner,
    tacPhamId,
    coAuthorCredits,
  });
}

export async function PUT(req: Request, ctx: RouteCtx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: tacPhamId } = await ctx.params;
  const isOwner = await assertTacPhamOwner(tacPhamId, session.profile.id);
  if (!isOwner) {
    return NextResponse.json({ error: "Chỉ chủ bài viết mới sửa được." }, { status: 403 });
  }

  let body: { collaborators?: CoAuthorDraft[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  if (!Array.isArray(body.collaborators)) {
    return NextResponse.json({ error: "Thiếu mảng collaborators." }, { status: 400 });
  }

  const collaborators: CoAuthorDraft[] = [];
  for (const raw of body.collaborators) {
    if (!raw || typeof raw !== "object") continue;
    const idNguoiDung =
      typeof raw.idNguoiDung === "string" ? raw.idNguoiDung.trim() : "";
    const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
    if (!idNguoiDung || !slug) continue;
    collaborators.push({
      idNguoiDung,
      slug,
      tenHienThi:
        typeof raw.tenHienThi === "string" && raw.tenHienThi.trim()
          ? raw.tenHienThi.trim()
          : slug,
      avatarId:
        typeof raw.avatarId === "string" ? raw.avatarId : raw.avatarId ?? null,
      vaiTro: typeof raw.vaiTro === "string" ? raw.vaiTro.trim() : "",
    });
  }

  const existing = await loadCoAuthorsForTacPham(tacPhamId);
  const ownerRow = existing.find((row) => row.laChuSoHuu);
  const ownerVaiTro = ownerRow?.vaiTro ?? "";

  const result = await syncCoAuthorsFromEditor(
    tacPhamId,
    session.profile.id,
    ownerVaiTro,
    collaborators,
  );
  if (!result.ok) {
    const status = result.error.includes("kết bạn") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const coAuthorCredits = await loadCoAuthorCreditsForTacPham(tacPhamId);
  return NextResponse.json({ ok: true, tacPhamId, coAuthorCredits });
}
