import { NextResponse } from "next/server";

import {
  removeAdminOrgMember,
  updateAdminOrgMemberRole,
} from "@/lib/admin/org-members";
import { assertSuperAdminDelegationActor } from "@/lib/admin/org-delegation";

type RouteContext = { params: Promise<{ id: string; membershipId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const actor = await assertSuperAdminDelegationActor();
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  const { id, membershipId } = await context.params;
  if (!id?.trim() || !membershipId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: { vaiTro?: string; delegationPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.vaiTro?.trim()) {
    return NextResponse.json({ error: "Thiếu vai trò." }, { status: 400 });
  }

  const result = await updateAdminOrgMemberRole({
    orgId: id,
    membershipId,
    vaiTro: body.vaiTro,
    delegationPassword: body.delegationPassword ?? "",
  });

  if (!result.ok) {
    const status = result.error.includes("Mật khẩu") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, member: result.member });
}

export async function DELETE(req: Request, context: RouteContext) {
  const actor = await assertSuperAdminDelegationActor();
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  const { id, membershipId } = await context.params;
  if (!id?.trim() || !membershipId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: { delegationPassword?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body JSON cần delegationPassword." },
      { status: 400 },
    );
  }

  const result = await removeAdminOrgMember({
    orgId: id,
    membershipId,
    delegationPassword: body.delegationPassword ?? "",
  });

  if (!result.ok) {
    const status = result.error.includes("Mật khẩu") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
