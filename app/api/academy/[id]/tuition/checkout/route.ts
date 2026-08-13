import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getOrgThanhToanFromCauHinh,
  mergeThanhToanIntoCauHinh,
} from "@/lib/co-so/don-hoc-phi-chat";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { isCoSoFounderTier } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string }> };

/** STK nhận tiền — sống trong "Cài đặt tối cao", founder-only (owner/admin), không qua ma trận. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if (!isCoSoFounderTier(vaiTro)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", orgId)
    .maybeSingle();
  const tt = getOrgThanhToanFromCauHinh(org?.cau_hinh);
  return NextResponse.json({
    nganHang: tt.nganHang ?? "",
    soTaiKhoan: tt.soTaiKhoan ?? "",
    tenChuTk: tt.tenChuTk ?? "",
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if (!isCoSoFounderTier(vaiTro)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    nganHang?: string;
    soTaiKhoan?: string;
    tenChuTk?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) {
    return NextResponse.json({ error: "Không tìm thấy cơ sở." }, { status: 404 });
  }

  const merged = mergeThanhToanIntoCauHinh(org.cau_hinh, {
    nganHang: body.nganHang ?? "",
    soTaiKhoan: body.soTaiKhoan ?? "",
    tenChuTk: body.tenChuTk ?? "",
  });

  const { error } = await admin
    .from("org_to_chuc")
    .update({ cau_hinh: merged })
    .eq("id", orgId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const tt = getOrgThanhToanFromCauHinh(merged);
  return NextResponse.json({
    nganHang: tt.nganHang ?? "",
    soTaiKhoan: tt.soTaiKhoan ?? "",
    tenChuTk: tt.tenChuTk ?? "",
  });
}
