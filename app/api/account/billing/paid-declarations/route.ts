import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { tuKhaiHoaDon } from "@/lib/billing/hoa-don";
import { canSuaTk } from "@/lib/billing/tk";
import { assertCanSuaOrgPhiKy } from "@/lib/billing/thong-tin";
import { tuKhaiDaTraKy } from "@/lib/co-so/phi-sepay";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

function tuKhaiFailResponse(result: {
  error: string;
  lyDo?: string;
  status?: number;
}) {
  const status =
    result.status ??
    (result.lyDo === "het_luot_tu_khai" ||
    result.error.includes("hết lượt tự khai")
      ? 409
      : 400);
  const body: Record<string, unknown> = { error: result.error };
  if (status === 409) {
    body.lyDo = "het_luot_tu_khai";
    body.goiY = "khieu_nai";
  }
  return NextResponse.json(body, { status });
}

/**
 * POST /api/tai-khoan/thanh-toan/tu-khai-da-tra
 * Body: { hoaDonId } (cins_hoa_don.id hoặc nguon_id) · hoặc { kyId, orgId } legacy.
 * Hết lượt tự khai → 409 + goiY khieu_nai.
 */
export async function POST(request: Request) {
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

  const hoaDonId =
    typeof body.hoaDonId === "string" ? body.hoaDonId.trim() : "";
  if (hoaDonId) {
    const admin = createServiceRoleClient();
    let hd = (
      await admin
        .from("cins_hoa_don")
        .select("id, id_tk")
        .eq("id", hoaDonId)
        .maybeSingle<{ id: string; id_tk: string }>()
    ).data;
    if (!hd) {
      hd = (
        await admin
          .from("cins_hoa_don")
          .select("id, id_tk")
          .eq("nguon_id", hoaDonId)
          .maybeSingle<{ id: string; id_tk: string }>()
      ).data;
    }
    if (hd) {
      if (!(await canSuaTk(hd.id_tk, actorId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const result = await tuKhaiHoaDon({ hoaDonId: hd.id, actorId });
      if (!result.ok) {
        return tuKhaiFailResponse(result);
      }
      return NextResponse.json({ ok: true, anHanDen: result.anHanDen });
    }
    /* Fallback legacy: hoaDonId = org_phi_ky.id */
    const orgId =
      typeof body.orgId === "string" ? body.orgId.trim() : "";
    if (orgId) {
      const gate = await assertCanSuaOrgPhiKy({
        actorId,
        orgId,
        kyId: hoaDonId,
      });
      if (!gate.ok) {
        return NextResponse.json(
          { error: gate.error },
          { status: gate.status },
        );
      }
      const result = await tuKhaiDaTraKy({
        orgId,
        kyId: hoaDonId,
        actorId,
      });
      if (!result.ok) {
        return tuKhaiFailResponse(result);
      }
      return NextResponse.json({ ok: true, anHanDen: result.anHanDen });
    }
  }

  const kyId = typeof body.kyId === "string" ? body.kyId.trim() : "";
  const orgId = typeof body.orgId === "string" ? body.orgId.trim() : "";
  if (!kyId || !orgId) {
    return NextResponse.json(
      { error: "Thiếu hoaDonId hoặc (kyId, orgId)." },
      { status: 400 },
    );
  }

  const gate = await assertCanSuaOrgPhiKy({ actorId, orgId, kyId });
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.status },
    );
  }

  const result = await tuKhaiDaTraKy({ orgId, kyId, actorId });
  if (!result.ok) {
    return tuKhaiFailResponse(result);
  }
  return NextResponse.json({ ok: true, anHanDen: result.anHanDen });
}
