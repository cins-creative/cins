import { NextResponse } from "next/server";

import { sanitizeBaiDangBlocksInput } from "@/lib/truong/bai-dang-blocks";
import {
  mapOrgBaiDangApiRow,
  ORG_BAI_DANG_API_SELECT,
} from "@/lib/truong/bai-dang-api-fields";
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
    "noi_dung_blocks",
    "cover_id",
    "trang_thai",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in body)) continue;
    if (key === "loai_bai_dang") {
      patch[key] = normalizeLoaiBaiDang(body[key]);
      continue;
    }
    if (key === "noi_dung_blocks") {
      patch[key] = sanitizeBaiDangBlocksInput(body[key]);
      continue;
    }
    patch[key] = body[key];
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
    .select(ORG_BAI_DANG_API_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ post: mapOrgBaiDangApiRow(data) });
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
