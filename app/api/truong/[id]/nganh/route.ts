import { NextResponse } from "next/server";

import { assertTruongInlineApi } from "@/lib/truong/inline-api";
import {
  linkNganhToOrg,
  listNganhCandidatesForOrg,
} from "@/lib/truong/nganh-program-crud";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const denied = assertTruongInlineApi(request);
  if (denied) return denied;

  const { id: orgId } = await context.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const items = await listNganhCandidatesForOrg(supabase, orgId.trim());

  return NextResponse.json({ items });
}

export async function POST(request: Request, context: RouteContext) {
  const denied = assertTruongInlineApi(request);
  if (denied) return denied;

  const { id: orgId } = await context.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { idNganh?: unknown; orgSlug?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const idNganh = String(body.idNganh ?? "").trim();
  const orgSlug = String(body.orgSlug ?? "").trim();
  if (!idNganh) {
    return NextResponse.json({ error: "Thiếu idNganh" }, { status: 400 });
  }
  if (!orgSlug) {
    return NextResponse.json({ error: "Thiếu orgSlug" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const result = await linkNganhToOrg(
    supabase,
    orgId.trim(),
    orgSlug,
    idNganh,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ program: result.program });
}
