import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listQuaySuKien, xinLamQuay } from "@/lib/shop/quay";
import type { ShopEvidence } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { canViewerManageSuKien } from "@/lib/to-chuc/su-kien";

type Ctx = { params: Promise<{ suKienId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { suKienId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const wantPending =
    new URL(request.url).searchParams.get("pending") === "1";

  let includePending = false;
  if (wantPending && session?.profile) {
    const admin = createServiceRoleClient();
    const { data: sk } = await admin
      .from("org_su_kien")
      .select("id_to_chuc")
      .eq("id", suKienId)
      .maybeSingle<{ id_to_chuc: string }>();
    if (
      sk &&
      (await canViewerManageSuKien(session.profile.id, sk.id_to_chuc))
    ) {
      includePending = true;
    }
  }

  const items = await listQuaySuKien(suKienId, {
    includePending,
    actorId: session?.profile?.id,
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { suKienId } = await ctx.params;
  let body: { cotMocId?: unknown; bangChung?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  const bangChung: ShopEvidence[] = [];
  if (Array.isArray(body.bangChung)) {
    for (const raw of body.bangChung) {
      const o = raw as Record<string, unknown>;
      if (
        typeof o.label !== "string" ||
        (o.kind !== "link" && o.kind !== "file" && o.kind !== "text")
      ) {
        continue;
      }
      const row: ShopEvidence = { label: o.label, kind: o.kind };
      if (typeof o.href === "string") row.href = o.href;
      if (typeof o.detail === "string") row.detail = o.detail;
      bangChung.push(row);
    }
  }

  try {
    const item = await xinLamQuay(session.profile.id, {
      suKienId,
      cotMocId: typeof body.cotMocId === "string" ? body.cotMocId : null,
      bangChung,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "BAN_HANG_OFF") {
      return NextResponse.json({ error: "Chưa bật bán hàng." }, { status: 403 });
    }
    if (msg === "EVIDENCE_REQUIRED") {
      return NextResponse.json(
        { error: "Cần ít nhất một bằng chứng (vé/mã quầy…)." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Không gửi được." }, { status: 500 });
  }
}
