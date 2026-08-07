import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  updateDichVuThongTinHd,
  updateTkThongTinHoaDon,
} from "@/lib/billing/thong-tin";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/**
 * PATCH /api/tai-khoan/thanh-toan/thong-tin
 * Body:
 *  - { scope: "tk", tenPhapNhan?, mst?, diaChi?, emailHoaDon? }
 *  - { scope: "dich_vu", dichVuId, hdTenPhapNhan?, hdMst?, hdDiaChi?, hdEmail? }
 */
export async function PATCH(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const scope = body.scope === "dich_vu" ? "dich_vu" : "tk";

  if (scope === "tk") {
    const result = await updateTkThongTinHoaDon({
      actorId,
      tenPhapNhan:
        body.tenPhapNhan === undefined
          ? undefined
          : (body.tenPhapNhan as string | null),
      mst: body.mst === undefined ? undefined : (body.mst as string | null),
      diaChi:
        body.diaChi === undefined ? undefined : (body.diaChi as string | null),
      emailHoaDon:
        body.emailHoaDon === undefined
          ? undefined
          : (body.emailHoaDon as string | null),
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({ ok: true, tk: result.tk });
  }

  const dichVuId =
    typeof body.dichVuId === "string" ? body.dichVuId.trim() : "";
  if (!dichVuId) {
    return NextResponse.json({ error: "Thiếu dichVuId." }, { status: 400 });
  }

  const result = await updateDichVuThongTinHd({
    actorId,
    dichVuId,
    hdTenPhapNhan:
      body.hdTenPhapNhan === undefined
        ? undefined
        : (body.hdTenPhapNhan as string | null),
    hdMst: body.hdMst === undefined ? undefined : (body.hdMst as string | null),
    hdDiaChi:
      body.hdDiaChi === undefined ? undefined : (body.hdDiaChi as string | null),
    hdEmail:
      body.hdEmail === undefined ? undefined : (body.hdEmail as string | null),
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true, dichVu: result.dichVu });
}
