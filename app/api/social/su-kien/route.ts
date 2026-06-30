import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getCotMocInsight,
  getOrgBaiDangInsight,
  recordSuKien,
} from "@/lib/social/su-kien";
import { isUuid } from "@/lib/social/su-kien-constants";

/**
 * GET /api/social/su-kien — số liệu tiếp cận RIÊNG TƯ của 1 đối tượng.
 *   - `?cotMocId=...`  → cột mốc (chủ bài / người được gắn / quản trị org)
 *   - `?baiDangId=...` → bài đăng tổ chức (chỉ quản trị viên tổ chức)
 * Server enforce quyền; 403 nếu không đủ quyền.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const cotMocId = params.get("cotMocId");
  const baiDangId = params.get("baiDangId");

  const target = cotMocId
    ? { loai: "cot_moc" as const, id: cotMocId }
    : baiDangId
      ? { loai: "org_bai_dang" as const, id: baiDangId }
      : null;
  if (!target || !isUuid(target.id)) {
    return NextResponse.json(
      { error: "Thiếu cotMocId hoặc baiDangId hợp lệ." },
      { status: 400 },
    );
  }

  const session = await getCurrentSessionAndProfile().catch(() => null);
  const requesterId = session?.profile?.id ?? null;
  if (!requesterId) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const insight =
    target.loai === "cot_moc"
      ? await getCotMocInsight(target.id, requesterId)
      : await getOrgBaiDangInsight(target.id, requesterId);
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
