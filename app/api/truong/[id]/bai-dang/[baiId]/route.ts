import { NextResponse } from "next/server";

import {
  sanitizeBaiDangBlocksInput,
  validateOrgBaiDangContent,
} from "@/lib/truong/bai-dang-blocks";
import {
  mapOrgBaiDangApiRow,
  ORG_BAI_DANG_API_SELECT,
} from "@/lib/truong/bai-dang-api-fields";
import { resolveOrgBaiDangLoaiForWrite } from "@/lib/truong/bai-dang";
import { sanitizeBaiDangCoverIdInput } from "@/lib/truong/bai-dang-cover";
import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string; baiId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id: orgId, baiId } = await context.params;
  if (!orgId?.trim() || !baiId?.trim()) {
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

  const allowed = [
    "tieu_de",
    "loai_bai_dang",
    "tom_tat",
    "noi_dung",
    "noi_dung_blocks",
    "cover_id",
    "trang_thai",
    "tao_luc",
    "ghim",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in body)) continue;
    if (key === "loai_bai_dang") {
      patch[key] = resolveOrgBaiDangLoaiForWrite(body[key]);
      continue;
    }
    if (key === "noi_dung_blocks") {
      patch[key] = sanitizeBaiDangBlocksInput(body[key]);
      continue;
    }
    if (key === "cover_id") {
      patch[key] = sanitizeBaiDangCoverIdInput(
        body[key],
        "noi_dung_blocks" in patch
          ? (patch.noi_dung_blocks as ReturnType<typeof sanitizeBaiDangBlocksInput>)
          : undefined,
      );
      continue;
    }
    if (key === "ghim") {
      patch[key] = Boolean(body[key]);
      continue;
    }
    if (key === "tao_luc") {
      const raw = String(body[key] ?? "").trim();
      if (!raw) {
        return NextResponse.json({ error: "Invalid tao_luc" }, { status: 400 });
      }
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid tao_luc" }, { status: 400 });
      }
      patch[key] = parsed.toISOString();
      continue;
    }
    patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields" }, { status: 400 });
  }

  const blocksForValidate =
    "noi_dung_blocks" in patch
      ? (patch.noi_dung_blocks as ReturnType<typeof sanitizeBaiDangBlocksInput>)
      : undefined;
  if (blocksForValidate?.length) {
    const contentCheck = validateOrgBaiDangContent({
      tomTat:
        "tom_tat" in patch
          ? typeof patch.tom_tat === "string"
            ? patch.tom_tat
            : patch.tom_tat == null
              ? null
              : String(patch.tom_tat)
          : undefined,
      coverId:
        "cover_id" in patch && typeof patch.cover_id === "string"
          ? patch.cover_id
          : null,
      blocks: blocksForValidate,
    });
    if (!contentCheck.ok) {
      return NextResponse.json({ error: contentCheck.error }, { status: 400 });
    }
    patch.tom_tat = contentCheck.resolution.effectiveMoTa;
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
  const { id: orgId, baiId } = await context.params;
  if (!orgId?.trim() || !baiId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, orgId);
  if (denied) return denied;

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
