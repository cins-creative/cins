import { NextResponse } from "next/server";

import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { removeMonFromTruongNganh } from "@/lib/truong/nganh-mon";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = {
  params: Promise<{ id: string; programId: string; monId: string }>;
};

/** DELETE — gỡ môn khỏi chương trình ngành. */
export async function DELETE(request: Request, context: RouteContext) {
  const { id: orgId, programId, monId } = await context.params;
  if (!orgId?.trim() || !programId?.trim() || !monId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, orgId);
  if (denied) return denied;

  const admin = createServiceRoleClient();
  const result = await removeMonFromTruongNganh(admin, {
    orgId: orgId.trim(),
    programId: programId.trim(),
    monHocId: monId.trim(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
