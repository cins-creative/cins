import { NextResponse } from "next/server";

import { sanitizeBaiDangBlocksInput } from "@/lib/truong/bai-dang-blocks";
import {
  mapOrgBaiDangApiRow,
  ORG_BAI_DANG_API_SELECT,
} from "@/lib/truong/bai-dang-api-fields";
import { normalizeLoaiBaiDang } from "@/lib/truong/bai-dang";
import { sanitizeBaiDangCoverIdInput } from "@/lib/truong/bai-dang-cover";
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

  const tieu_de = String(body.tieu_de ?? "").trim();
  if (!tieu_de) {
    return NextResponse.json({ error: "tieu_de required" }, { status: 400 });
  }

  const insertRow: Record<string, unknown> = {
    id_to_chuc: orgId,
    tieu_de,
    loai_bai_dang: normalizeLoaiBaiDang(body.loai_bai_dang),
    tom_tat: body.tom_tat ?? null,
    noi_dung: body.noi_dung ?? null,
    trang_thai: body.trang_thai ?? "da_dang",
  };
  if ("tao_luc" in body) {
    const raw = String(body.tao_luc ?? "").trim();
    if (!raw) {
      return NextResponse.json({ error: "Invalid tao_luc" }, { status: 400 });
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid tao_luc" }, { status: 400 });
    }
    insertRow.tao_luc = parsed.toISOString();
  }
  if ("noi_dung_blocks" in body) {
    insertRow.noi_dung_blocks = sanitizeBaiDangBlocksInput(body.noi_dung_blocks);
  }
  insertRow.cover_id = sanitizeBaiDangCoverIdInput(
    body.cover_id,
    insertRow.noi_dung_blocks as ReturnType<typeof sanitizeBaiDangBlocksInput> | undefined,
  );

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("org_bai_dang")
    .insert(insertRow)
    .select(ORG_BAI_DANG_API_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: mapOrgBaiDangApiRow(data) });
}
