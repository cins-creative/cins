import { NextResponse } from "next/server";

import {
  addAdminOrgMember,
  getAdminOrgMembersPayload,
} from "@/lib/admin/org-members";
import { assertSuperAdminDelegationActor } from "@/lib/admin/org-delegation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const actor = await assertSuperAdminDelegationActor();
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const result = await getAdminOrgMembersPayload(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.payload);
}

export async function POST(req: Request, context: RouteContext) {
  const actor = await assertSuperAdminDelegationActor();
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: {
    userId?: string;
    slug?: string;
    vaiTro?: string;
    delegationPassword?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.vaiTro?.trim()) {
    return NextResponse.json({ error: "Thiếu vai trò." }, { status: 400 });
  }

  const result = await addAdminOrgMember({
    orgId: id,
    userId: body.userId,
    slug: body.slug,
    vaiTro: body.vaiTro,
    delegationPassword: body.delegationPassword ?? "",
  });

  if (!result.ok) {
    const status = result.error.includes("Mật khẩu") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, member: result.member });
}
