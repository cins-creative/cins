import { NextResponse } from "next/server";

import { assertTruongInlineApi } from "@/lib/truong/inline-api";
import type { TuyenSinhInsertPayload } from "@/lib/truong/tuyen-sinh-client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

function parseOptionalNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isNaN(n) ? null : n;
}

export async function POST(request: Request, context: RouteContext) {
  const denied = assertTruongInlineApi(request);
  if (denied) return denied;

  const { id: orgId } = await context.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { nam?: unknown; entries?: unknown };
  try {
    body = (await request.json()) as { nam?: unknown; entries?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nam =
    typeof body.nam === "number" ? body.nam : Number(String(body.nam ?? "").trim());
  if (Number.isNaN(nam) || nam < 2000 || nam > 2100) {
    return NextResponse.json({ error: "Năm không hợp lệ" }, { status: 400 });
  }

  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (!entries.length) {
    return NextResponse.json({ error: "Thiếu danh sách ngành" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: linkRows, error: linkErr } = await supabase
    .from("org_truong_nganh")
    .select("id")
    .eq("id_to_chuc", orgId.trim())
    .eq("trang_thai_chuong_trinh", "dang_tuyen");

  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  const validIds = new Set(
    (linkRows ?? [])
      .map((r) => (r as { id?: string }).id?.trim())
      .filter(Boolean) as string[],
  );

  const toInsert: {
    id_truong_nganh: string;
    nam: number;
    chi_tieu: number | null;
    diem_chuan: number | null;
  }[] = [];
  const thoiGianByProgram = new Map<string, number>();
  const skippedExisting: string[] = [];
  const invalidIds: string[] = [];

  for (const raw of entries) {
    const e = raw as TuyenSinhInsertPayload;
    const pid = e.truongNganhId?.trim();
    if (!pid) continue;
    if (!validIds.has(pid)) {
      invalidIds.push(pid);
      continue;
    }

    const { data: existing } = await supabase
      .from("org_tuyen_sinh_nam")
      .select("id")
      .eq("id_truong_nganh", pid)
      .eq("nam", nam)
      .maybeSingle();

    if (existing?.id) {
      skippedExisting.push(pid);
      continue;
    }

    const chi = parseOptionalNum(e.chi_tieu);
    const diem = parseOptionalNum(e.diem_chuan);
    const thang = parseOptionalNum(e.thoi_gian_thang);

    toInsert.push({
      id_truong_nganh: pid,
      nam,
      chi_tieu: chi,
      diem_chuan: diem,
    });

    if (thang != null && thang > 0) {
      thoiGianByProgram.set(pid, Math.round(thang));
    }
  }

  if (!toInsert.length) {
    return NextResponse.json(
      {
        error:
          skippedExisting.length > 0
            ? `Tất cả ngành đã có dữ liệu năm ${nam}. Chọn năm khác hoặc sửa từng dòng trong tab Tuyển sinh.`
            : "Không có dòng hợp lệ để thêm",
        skippedExisting,
        invalidIds,
      },
      { status: 400 },
    );
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("org_tuyen_sinh_nam")
    .insert(toInsert)
    .select("id, id_truong_nganh, nam, chi_tieu, diem_chuan");

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  for (const [programId, thoi_gian_thang] of thoiGianByProgram) {
    await supabase
      .from("org_truong_nganh")
      .update({ thoi_gian_thang })
      .eq("id", programId);
  }

  return NextResponse.json({
    nam,
    rows: inserted ?? [],
    skippedExisting,
    invalidIds,
  });
}
