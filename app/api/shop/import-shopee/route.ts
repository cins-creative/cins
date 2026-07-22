import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  applyShopeeImport,
  buildShopeeImportPreview,
  type ShopeeImportPreview,
} from "@/lib/shop/shopee";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/shop/import-shopee
 * Body: { url: string, apply?: boolean, raw?: object }
 *
 * - apply=false (mặc định): preview (đã reup CF + Claude rút tên/mô tả)
 * - apply=true: tạo loại hàng + mẫu trong kho
 * - raw: JSON get_pc (khi server bị Shopee anti-bot)
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  let body: {
    url?: unknown;
    apply?: unknown;
    raw?: unknown;
    preview?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const apply = body.apply === true;
  const raw = body.raw;

  try {
    let preview: ShopeeImportPreview;

    if (
      apply &&
      body.preview &&
      typeof body.preview === "object" &&
      body.preview !== null
    ) {
      preview = body.preview as ShopeeImportPreview;
      if (!preview.nhan || !Array.isArray(preview.images)) {
        return NextResponse.json(
          { error: "Preview không hợp lệ." },
          { status: 422 },
        );
      }
    } else {
      preview = await buildShopeeImportPreview({
        url: url || undefined,
        raw,
      });
    }

    if (!apply) {
      return NextResponse.json({ ok: true, preview });
    }

    const result = await applyShopeeImport(session.profile.id, preview);
    return NextResponse.json(
      {
        ok: true,
        nhom: result.nhom,
        products: result.products,
        preview,
      },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi import Shopee.";
    if (msg === "BAN_HANG_OFF") {
      return NextResponse.json(
        { error: "Hãy bật bán hàng trong cài đặt trước." },
        { status: 403 },
      );
    }
    if (msg === "SHOP_NOT_READY") {
      return NextResponse.json(
        {
          error:
            "Cần thêm tài khoản nhận tiền trong Shop trước khi thêm hàng.",
        },
        { status: 403 },
      );
    }
    console.error("[api/shop/import-shopee]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
