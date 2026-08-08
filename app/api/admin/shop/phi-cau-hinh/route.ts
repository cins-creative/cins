import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getShopCauHinhPhi,
  updateShopCauHinhPhi,
} from "@/lib/shop/phi-config";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** GET /api/admin/shop/phi-cau-hinh */
export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const cauHinh = await getShopCauHinhPhi();
  return NextResponse.json({ cauHinh });
}

/** PATCH /api/admin/shop/phi-cau-hinh — body: { tyLePercent: 5 } hoặc { tyLe: 0.05 } */
export async function PATCH(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: { tyLe?: unknown; tyLePercent?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  let tyLe: number | undefined;
  if (typeof body.tyLePercent === "number" && Number.isFinite(body.tyLePercent)) {
    tyLe = body.tyLePercent / 100;
  } else if (typeof body.tyLePercent === "string") {
    const t = body.tyLePercent.trim();
    if (t !== "") {
      const n = Number(t.replace(",", "."));
      if (Number.isFinite(n)) tyLe = n / 100;
    }
  } else if (typeof body.tyLe === "number" && Number.isFinite(body.tyLe)) {
    tyLe = body.tyLe;
  }
  if (tyLe === undefined || tyLe < 0 || tyLe > 1) {
    return NextResponse.json(
      { error: "Tỷ lệ phải từ 0% đến 100%." },
      { status: 422 },
    );
  }

  try {
    const cauHinh = await updateShopCauHinhPhi(session.profile.id, tyLe);
    return NextResponse.json({ cauHinh });
  } catch {
    return NextResponse.json({ error: "Không lưu được." }, { status: 500 });
  }
}
