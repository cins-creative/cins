import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import {
  xuLyWebhookSepay,
  type SepayWebhookPayload,
} from "@/lib/co-so/phi-sepay";

export const runtime = "nodejs";

/**
 * Auth Sepay: Bearer hoặc `Apikey` (dashboard Sepay thường dùng Apikey).
 * Env: `SEPAY_WEBHOOK_SECRET`.
 */
function xacThucSepay(request: Request):
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string } {
  const expected = process.env.SEPAY_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: "Chưa cấu hình SEPAY_WEBHOOK_SECRET.",
    };
  }

  const auth = request.headers.get("authorization")?.trim() ?? "";
  let token = "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    token = auth.slice(7).trim();
  } else if (auth.toLowerCase().startsWith("apikey ")) {
    token = auth.slice(7).trim();
  }

  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}

/**
 * POST /api/webhook/sepay
 * Nhận giao dịch vào STK CINs → khớp mã `CINSxxxxxxxxxx` → cộng `da_tra_vnd`.
 * Response `{ success: true }` theo convention Sepay.
 */
export async function POST(request: Request) {
  const auth = xacThucSepay(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, {
      status: auth.status,
    });
  }

  let body: SepayWebhookPayload;
  try {
    body = (await request.json()) as SepayWebhookPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: "JSON không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const result = await xuLyWebhookSepay(body);
    if (!result.ok) {
      console.error("[webhook/sepay]", result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 },
      );
    }
    return NextResponse.json({
      success: true,
      duplicate: result.duplicate ?? false,
      matched: result.matched,
      kyId: result.kyId,
      daTraKy: result.daTraKy ?? false,
    });
  } catch (e) {
    console.error("[webhook/sepay]", e);
    return NextResponse.json(
      { success: false, error: "Xử lý thất bại." },
      { status: 500 },
    );
  }
}
