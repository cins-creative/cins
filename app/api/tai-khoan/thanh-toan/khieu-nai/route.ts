import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  listKhieuNaiForTk,
  taoKhieuNaiBilling,
} from "@/lib/billing/khieu-nai";
import { findAccessibleTkForUser } from "@/lib/billing/tk";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** GET /api/tai-khoan/thanh-toan/khieu-nai */
export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const access = await findAccessibleTkForUser(actorId);
  if (!access) {
    return NextResponse.json({ items: [] });
  }
  const items = await listKhieuNaiForTk(access.tk.id);
  return NextResponse.json({ items });
}

/**
 * POST /api/tai-khoan/thanh-toan/khieu-nai
 * Body: { hoaDonId?, dichVuId?, loai?, noiDung, maGiaoDich?, soTienKhai?, ckLuc?, anhIds[] }
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

  const anhRaw = body.anhIds;
  const anhIds = Array.isArray(anhRaw)
    ? anhRaw.filter((x): x is string => typeof x === "string")
    : [];

  const soTienRaw = body.soTienKhai;
  const soTienKhai =
    typeof soTienRaw === "number"
      ? soTienRaw
      : typeof soTienRaw === "string" && soTienRaw.trim()
        ? Number(soTienRaw)
        : null;

  const result = await taoKhieuNaiBilling({
    actorId,
    hoaDonId: typeof body.hoaDonId === "string" ? body.hoaDonId : null,
    dichVuId: typeof body.dichVuId === "string" ? body.dichVuId : null,
    loai: typeof body.loai === "string" ? body.loai : null,
    noiDung: typeof body.noiDung === "string" ? body.noiDung : "",
    maGiaoDich: typeof body.maGiaoDich === "string" ? body.maGiaoDich : null,
    soTienKhai:
      soTienKhai != null && Number.isFinite(soTienKhai) ? soTienKhai : null,
    ckLuc: typeof body.ckLuc === "string" ? body.ckLuc : null,
    anhIds,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ item: result.item }, { status: 201 });
}
