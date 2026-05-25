import { NextResponse } from "next/server";

import { normalizeLoaiBaiDang } from "@/lib/truong/bai-dang";
import { assertTruongInlineApi } from "@/lib/truong/inline-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string; baiId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const denied = assertTruongInlineApi(request);
  if (denied) return denied;

  const { id: orgId, baiId } = await context.params;
  if (!orgId?.trim() || !baiId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed = [
    "tieu_de",
    "loai_bai_dang",
    "tom_tat",
    "noi_dung",
    "cover_id",
    "trang_thai",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      patch[key] =
        key === "loai_bai_dang"
          ? normalizeLoaiBaiDang(body[key])
          : body[key];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("org_bai_dang")
    .update(patch)
    .eq("id", baiId)
    .eq("id_to_chuc", orgId)
    .select(
      "id, loai_bai_dang, tieu_de, tom_tat, noi_dung, cover_id, tao_luc, trang_thai",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = assertTruongInlineApi(request);
  if (denied) return denied;

  const { id: orgId, baiId } = await context.params;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("org_bai_dang")
    .update({ trang_thai: "archived" })
    .eq("id", baiId)
    .eq("id_to_chuc", orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
