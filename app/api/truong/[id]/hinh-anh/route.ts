import { NextResponse } from "next/server";

import { normalizeHinhAnhLoai } from "@/lib/truong/hinh-anh";
import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: orgId } = await context.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, orgId);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cloudflare_id = String(body.cloudflare_id ?? "").trim();
  if (!cloudflare_id) {
    return NextResponse.json({ error: "cloudflare_id required" }, { status: 400 });
  }

  const loai = normalizeHinhAnhLoai(body.loai);
  const thu_tu =
    typeof body.thu_tu === "number" && !Number.isNaN(body.thu_tu)
      ? body.thu_tu
      : Number(body.thu_tu) || 0;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("org_hinh_anh")
    .insert({
      id_to_chuc: orgId,
      cloudflare_id,
      caption:
        typeof body.caption === "string" ? body.caption.trim() || null : null,
      loai,
      thu_tu,
    })
    .select("id, cloudflare_id, caption, loai, thu_tu")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ photo: data });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id: orgId } = await context.params;
  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get("photoId")?.trim();
  if (!orgId?.trim() || !photoId) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, orgId);
  if (denied) return denied;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("org_hinh_anh")
    .delete()
    .eq("id", photoId)
    .eq("id_to_chuc", orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
