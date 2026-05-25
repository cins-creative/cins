import { NextResponse } from "next/server";

import { normalizeLoaiBaiDang } from "@/lib/truong/bai-dang";
import { assertTruongInlineApi } from "@/lib/truong/inline-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const denied = assertTruongInlineApi(request);
  if (denied) return denied;

  const { id: orgId } = await context.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tieu_de = String(body.tieu_de ?? "").trim();
  if (!tieu_de) {
    return NextResponse.json({ error: "tieu_de required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("org_bai_dang")
    .insert({
      id_to_chuc: orgId,
      tieu_de,
      loai_bai_dang: normalizeLoaiBaiDang(body.loai_bai_dang),
      tom_tat: body.tom_tat ?? null,
      noi_dung: body.noi_dung ?? null,
      cover_id: body.cover_id ?? null,
      trang_thai: body.trang_thai ?? "da_dang",
    })
    .select(
      "id, loai_bai_dang, tieu_de, tom_tat, noi_dung, cover_id, tao_luc, trang_thai",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}
