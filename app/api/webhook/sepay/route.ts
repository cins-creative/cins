import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { parseSepayRequestBody } from "@/lib/billing/sepay-giao-dich";
import { xuLyWebhookSepay } from "@/lib/co-so/phi-sepay";

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
 * Log thô → khớp mã `CINSxxxxxxxxxx` → cộng `da_tra_vnd`.
 * Response `{ success: true }` theo convention Sepay.
 * Plan: docs/PLAN_sepay_cins.md §4.2 — 500 = retry; 200/400 = không retry.
 */
export async function POST(request: Request) {
  const auth = xacThucSepay(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, {
      status: auth.status,
    });
  }

  let raw: Record<string, unknown>;
  try {
    raw = await parseSepayRequestBody(request);
  } catch {
    console.error("[webhook/sepay] body parse failed");
    return NextResponse.json(
      { success: false, error: "Body không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const result = await xuLyWebhookSepay(raw);
    if (!result.ok) {
      console.error("[webhook/sepay]", result.error);
      if (result.transient) {
        return NextResponse.json(
          { success: false, error: "Xử lý tạm thất bại." },
          { status: 500 },
        );
      }
      /* Lỗi không cứu được bằng retry → 200 skipped */
      return NextResponse.json({
        success: true,
        skipped: result.error,
      });
    }
    if ("skipped" in result && result.skipped) {
      return NextResponse.json({
        success: true,
        skipped: result.skipped,
        sepayId: result.sepayId ?? null,
      });
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
