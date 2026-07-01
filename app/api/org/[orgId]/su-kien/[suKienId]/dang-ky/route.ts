import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  datPhanHoiSuKien,
  demDangKySeThamGia,
  isLoaiPhanHoiSuKien,
  layPhanHoiViewer,
} from "@/lib/to-chuc/su-kien-dang-ky";

type RouteContext = {
  params: Promise<{ orgId: string; suKienId: string }>;
};

/** GET — trạng thái phản hồi của viewer + số đăng ký tham gia. */
export async function GET(_req: Request, ctx: RouteContext) {
  const { suKienId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const counts = await demDangKySeThamGia([suKienId]);
  const soDangKy = counts.get(suKienId) ?? 0;

  if (!session?.profile) {
    return NextResponse.json({ loai: null, soDangKy });
  }

  const loai = await layPhanHoiViewer(suKienId, session.profile.id);
  return NextResponse.json({ loai, soDangKy });
}

/** POST — đặt "Quan tâm" hoặc "Sẽ tham gia" (toggle nếu đã chọn cùng loại). */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { suKienId } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Body JSON không hợp lệ." },
      { status: 400 },
    );
  }

  const loai = body.loai;
  if (!isLoaiPhanHoiSuKien(loai)) {
    return NextResponse.json(
      { error: "Loại phản hồi không hợp lệ." },
      { status: 400 },
    );
  }

  const result = await datPhanHoiSuKien(suKienId, session.profile.id, loai);
  if (!result.ok) {
    const status = result.error.includes("hết chỗ") ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    loai: result.loai,
    soDangKy: result.soDangKy,
  });
}
