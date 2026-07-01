import { NextResponse } from "next/server";

import { transferAdminOrgOwner } from "@/lib/admin/org-members";
import { assertSuperAdminDelegationActor } from "@/lib/admin/org-delegation";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const actor = await assertSuperAdminDelegationActor();
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: { membershipId?: string; delegationPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.membershipId?.trim()) {
    return NextResponse.json({ error: "Thiếu membershipId." }, { status: 400 });
  }

  const result = await transferAdminOrgOwner({
    orgId: id,
    membershipId: body.membershipId,
    delegationPassword: body.delegationPassword ?? "",
  });

  if (!result.ok) {
    const status = result.error.includes("Mật khẩu") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, members: result.members });
}
