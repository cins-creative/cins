import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { applyNhomGiaMacDinh } from "@/lib/shop/nhom";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/shop/nhom/[id]/ap-dung-gia — ghi «Giá gốc» của loại xuống dòng giá
 * của mọi biến thể (seller). Idempotent; luôn chạy dù giá không đổi.
 */
export async function POST(_request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Thiếu id nhóm." }, { status: 422 });
  }

  try {
    const { count, giaMacDinh } = await applyNhomGiaMacDinh(
      session.profile.id,
      id.trim(),
    );
    return NextResponse.json({ count, giaMacDinh });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "BAN_HANG_OFF") {
      return NextResponse.json(
        { error: "Hãy bật bán hàng trong cài đặt trước." },
        { status: 403 },
      );
    }
    if (msg === "NHOM_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy loại." }, { status: 404 });
    }
    if (msg === "GIA_TRUC") {
      return NextResponse.json(
        { error: "Chỉ loại hàng (trục 1) mới áp dụng giá gốc." },
        { status: 422 },
      );
    }
    if (msg === "GIA_MAC_DINH_MISSING") {
      return NextResponse.json(
        { error: "Hãy nhập Giá gốc cho loại trước khi áp dụng." },
        { status: 422 },
      );
    }
    console.error("[api/shop/nhom/[id]/ap-dung-gia]", e);
    return NextResponse.json({ error: "Không áp dụng được giá." }, { status: 500 });
  }
}
