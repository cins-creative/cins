import { NextResponse } from "next/server";

import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import {
  addMonsToTruongNganh,
  addMonToTruongNganh,
  listMonForTruongNganh,
  reorderMonsOnTruongNganh,
} from "@/lib/truong/nganh-mon";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = {
  params: Promise<{ id: string; programId: string }>;
};

/** GET — danh sách môn học thuộc chương trình ngành (public read). */
export async function GET(_request: Request, context: RouteContext) {
  const { id: orgId, programId } = await context.params;
  if (!orgId?.trim() || !programId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

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

  const items = await listMonForTruongNganh(admin, programId);
  return NextResponse.json({ items });
}

/** POST — thêm môn vào chương trình (admin trường). */
export async function POST(request: Request, context: RouteContext) {
  const { id: orgId, programId } = await context.params;
  if (!orgId?.trim() || !programId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, orgId);
  if (denied) return denied;

  let body: {
    monHocId?: string;
    monHocIds?: string[];
    tenMonMoi?: string;
  };
  try {
    body = (await request.json()) as {
      monHocId?: string;
      monHocIds?: string[];
      tenMonMoi?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  if (Array.isArray(body.monHocIds) && body.monHocIds.length > 0) {
    const batch = await addMonsToTruongNganh(admin, {
      orgId: orgId.trim(),
      programId: programId.trim(),
      monHocIds: body.monHocIds,
    });
    if (!batch.ok) {
      return NextResponse.json({ error: batch.error }, { status: 400 });
    }
    return NextResponse.json({ items: batch.items });
  }

  const result = await addMonToTruongNganh(admin, {
    orgId: orgId.trim(),
    programId: programId.trim(),
    monHocId: body.monHocId ?? null,
    tenMonMoi: body.tenMonMoi ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ item: result.item });
}

/** PATCH — sắp xếp lại `thu_tu` theo mảng `monHocIds`. */
export async function PATCH(request: Request, context: RouteContext) {
  const { id: orgId, programId } = await context.params;
  if (!orgId?.trim() || !programId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, orgId);
  if (denied) return denied;

  let body: { monHocIds?: unknown };
  try {
    body = (await request.json()) as { monHocIds?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.monHocIds) || body.monHocIds.length === 0) {
    return NextResponse.json(
      { error: "Thiếu monHocIds (mảng id theo thứ tự)." },
      { status: 400 },
    );
  }

  const monHocIds = body.monHocIds
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter(Boolean);

  const admin = createServiceRoleClient();
  const result = await reorderMonsOnTruongNganh(admin, {
    orgId: orgId.trim(),
    programId: programId.trim(),
    monHocIds,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ items: result.items });
}
