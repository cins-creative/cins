import { NextResponse } from "next/server";

import {
  createShopDanhMuc,
  listShopDanhMucForAdmin,
} from "@/lib/admin/shop-danh-muc-server";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** GET /api/admin/shop/danh-muc — danh sách (kể cả `an`). */
export async function GET(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { ok: false, error: "Thiếu service role." },
      { status: 503 },
    );
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const nganhHang = url.searchParams.get("nganhHang")?.trim() || "merch";

  try {
    const rows = await listShopDanhMucForAdmin({ nganhHang });
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/admin/shop/danh-muc — tạo danh mục (global `hien` mặc định). */
export async function POST(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { ok: false, error: "Thiếu service role." },
      { status: 503 },
    );
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: {
    ten?: string;
    slug?: string;
    moTa?: string | null;
    thuTu?: number;
    nganhHang?: string;
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

  const ten = typeof body.ten === "string" ? body.ten : "";
  if (!ten.trim()) {
    return NextResponse.json(
      { ok: false, error: "Thiếu tên danh mục." },
      { status: 400 },
    );
  }

  try {
    const row = await createShopDanhMuc({
      ten,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      moTa: body.moTa,
      thuTu: body.thuTu,
      nganhHang: body.nganhHang,
      trangThai: body.trangThai,
      idCha: typeof body.idCha === "string" ? body.idCha : null,
    });
    return NextResponse.json({ ok: true, row }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    const status =
      message.includes("Slug") ||
      message.includes("Tên") ||
      message.includes("Cấp cha")
        ? 422
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
