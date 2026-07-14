import { NextResponse } from "next/server";

import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { listMonHocCatalog, listMonForTruongNganh } from "@/lib/truong/nganh-mon";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = {
  params: Promise<{ id: string; programId: string }>;
};

/** GET — catalog `mon_hoc` để picker (admin trường); loại môn đã gắn chương trình. */
export async function GET(request: Request, context: RouteContext) {
  const { id: orgId, programId } = await context.params;
  if (!orgId?.trim() || !programId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, orgId);
  if (denied) return denied;

  const admin = createServiceRoleClient();
  const { data: link } = await admin
    .from("org_truong_nganh")
    .select("id")
    .eq("id", programId)
    .eq("id_to_chuc", orgId)
    .maybeSingle<{ id: string }>();

  if (!link?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const linked = await listMonForTruongNganh(admin, programId);
  const items = await listMonHocCatalog(admin, {
    query,
    excludeIds: linked.map((m) => m.monHocId),
  });

  return NextResponse.json({ items });
}
