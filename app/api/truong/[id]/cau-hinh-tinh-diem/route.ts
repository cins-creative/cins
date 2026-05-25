import { NextResponse } from "next/server";

import { assertTruongInlineApi } from "@/lib/truong/inline-api";
import { resolveCauHinhTinhDiemApi } from "@/lib/truong/cau-hinh-tinh-diem";
import { saveCauHinhMonThi } from "@/lib/truong/save-cau-hinh-mon-thi";
import type { TruongCauHinhMon } from "@/lib/truong/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const nam = Number(searchParams.get("nam") ?? "");
  const nganh = searchParams.get("nganh")?.trim() || null;
  const khoi = searchParams.get("khoi")?.trim() || null;

  if (!id?.trim() || Number.isNaN(nam) || nam < 2000) {
    return NextResponse.json({ error: "Invalid id or nam" }, { status: 400 });
  }

  const config = await resolveCauHinhTinhDiemApi(id, nam, {
    truongNganhId: nganh,
    khoiId: nganh ? null : khoi,
  });

  if (!config?.mon?.length) {
    return NextResponse.json(
      {
        error: "Not found",
        hint: nganh
          ? "Thiếu org_cau_hinh_khoi (id_truong_nganh + nam_ap_dung) hoặc org_cau_hinh_mon"
          : "Thiếu khối thi hoặc tham số nganh",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    config,
    id_truong_nganh: nganh,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const denied = assertTruongInlineApi(request);
  if (denied) return denied;

  const { id: orgId } = await context.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { nam?: unknown; nganh?: unknown; mon?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nam =
    typeof body.nam === "number" ? body.nam : Number(String(body.nam ?? "").trim());
  const programId = String(body.nganh ?? "").trim();
  const mon = Array.isArray(body.mon) ? (body.mon as TruongCauHinhMon[]) : [];

  const result = await saveCauHinhMonThi({
    orgId: orgId.trim(),
    programId,
    nam,
    mon,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 500 },
    );
  }

  return NextResponse.json({
    config: result.config,
    id_truong_nganh: programId,
  });
}
