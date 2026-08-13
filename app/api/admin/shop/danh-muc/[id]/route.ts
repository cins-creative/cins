import { NextResponse } from "next/server";

import { deleteShopDanhMuc, patchShopDanhMuc } from "@/lib/admin/shop-danh-muc-server";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ id: string }> };

function patchErrorStatus(message: string): number {
  if (message.includes("tìm thấy")) return 404;
  if (
    message.includes("Slug") ||
    message.includes("Tên") ||
    message.includes("trường") ||
    message.includes("cấp cha") ||
    message.includes("Cấp cha") ||
    message.includes("Cây chỉ") ||
    message.includes("Không đặt") ||
    message.includes("Không dùng lá")
  ) {
    return 422;
  }
  return 500;
}

function deleteErrorStatus(message: string): number {
  if (message.includes("tìm thấy")) return 404;
  if (
    message.includes("Không xóa") ||
    message.includes("Còn lá") ||
    message.includes("loại gắn")
  ) {
    return 409;
  }
  return 500;
}

/** PATCH /api/admin/shop/danh-muc/[id] — sửa tên/slug/mô tả/thứ tự/ẩn/cấp cha. */
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
    idCha?: string | null;
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
      idCha:
        typeof body.idCha === "string"
          ? body.idCha
          : body.idCha === null
            ? null
            : undefined,
    });
    return NextResponse.json({ ok: true, row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: patchErrorStatus(message) },
    );
  }
}

/** DELETE /api/admin/shop/danh-muc/[id] — xóa mục trống (không lá con, không loại). */
export async function DELETE(_request: Request, ctx: Ctx) {
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

  try {
    await deleteShopDanhMuc(id.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: deleteErrorStatus(message) },
    );
  }
}
