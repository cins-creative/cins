import { NextResponse } from "next/server";

import { patchShopDanhMuc } from "@/lib/admin/shop-danh-muc-server";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/shop/danh-muc/[id] — sửa tên/slug/mô tả/thứ tự/ẩn. */
export async function PATCH(request: Request, ctx: Ctx) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { ok: false, error: "Thiếu service role." },
      { status: 503 },
    );
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Thiếu id." },
      { status: 400 },
    );
  }

  let body: {
    ten?: string;
    slug?: string;
    moTa?: string | null;
    thuTu?: number;
    trangThai?: "hien" | "an";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const row = await patchShopDanhMuc(id.trim(), {
      ten: typeof body.ten === "string" ? body.ten : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      moTa: body.moTa,
      thuTu: body.thuTu,
      trangThai: body.trangThai,
    });
    return NextResponse.json({ ok: true, row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    const status =
      message.includes("Slug") ||
      message.includes("Tên") ||
      message.includes("tìm thấy") ||
      message.includes("trường")
        ? 422
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
