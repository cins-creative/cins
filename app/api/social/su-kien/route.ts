import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getCotMocInsight, recordSuKien } from "@/lib/social/su-kien";
import { isUuid } from "@/lib/social/su-kien-constants";

/**
 * GET /api/social/su-kien?cotMocId=... — số liệu tiếp cận của 1 cột mốc.
 * Chỉ chủ bài cá nhân hoặc quản trị viên tổ chức (server enforce). 403 nếu không đủ quyền.
 */
export async function GET(req: Request) {
  const cotMocId = new URL(req.url).searchParams.get("cotMocId");
  if (!isUuid(cotMocId)) {
    return NextResponse.json({ error: "Thiếu cotMocId hợp lệ." }, { status: 400 });
  }
  const session = await getCurrentSessionAndProfile().catch(() => null);
  const requesterId = session?.profile?.id ?? null;
  if (!requesterId) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }
  const insight = await getCotMocInsight(cotMocId, requesterId);
  if (!insight) {
    return NextResponse.json(
      { error: "Bạn không có quyền xem số liệu nội dung này." },
      { status: 403 },
    );
  }
  return NextResponse.json({ insight });
}

/**
 * POST /api/social/su-kien — ghi batch event tiếp cận / tương tác.
 * Tương thích navigator.sendBeacon (body có thể là text/plain JSON).
 * Không trả số liệu cho client (phản-vanity).
 */
export async function POST(req: Request) {
  let body: { events?: unknown; phien_id?: unknown } | null = null;
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }
  if (!body || !Array.isArray(body.events)) {
    return NextResponse.json({ error: "Thiếu events." }, { status: 400 });
  }

  /* Người xem (nếu đăng nhập) — không bắt buộc; khách vẫn đo qua phien_id. */
  const session = await getCurrentSessionAndProfile().catch(() => null);
  const nguoiXemId = session?.profile?.id ?? null;
  const phienIdRaw =
    typeof body.phien_id === "string" ? body.phien_id : null;

  const result = await recordSuKien(body.events, { nguoiXemId, phienIdRaw });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, written: result.written });
}
