import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import type { CoAuthorDraft } from "@/lib/social/types";
import {
  loadCoAuthorsForOrgBaiDang,
  loadOrgBaiDangCoAuthorCredits,
  syncOrgBaiDangCoAuthorsFromEditor,
} from "@/lib/truong/org-bai-dang-coauthor";
import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteCtx = { params: Promise<{ id: string; baiId: string }> };

async function assertOrgBaiDangInOrg(
  orgId: string,
  baiDangId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_bai_dang")
    .select("id")
    .eq("id", baiDangId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id: orgId, baiId } = await ctx.params;
  if (!orgId?.trim() || !baiId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(_req, orgId);
  if (denied) return denied;

  if (!(await assertOrgBaiDangInOrg(orgId, baiId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await loadCoAuthorsForOrgBaiDang(baiId);
  return NextResponse.json({ tac_gia: rows });
}

export async function PUT(req: Request, ctx: RouteCtx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, baiId } = await ctx.params;
  if (!orgId?.trim() || !baiId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(req, orgId);
  if (denied) return denied;

  if (!(await assertOrgBaiDangInOrg(orgId, baiId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const result = await syncOrgBaiDangCoAuthorsFromEditor(
    baiId,
    session.profile.id,
    collaborators,
  );
  if (!result.ok) {
    const status = result.error.includes("kết bạn") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const creditsMap = await loadOrgBaiDangCoAuthorCredits([baiId]);
  return NextResponse.json({
    ok: true,
    tacPhamId: baiId,
    coAuthorCredits: creditsMap.get(baiId) ?? [],
  });
}
