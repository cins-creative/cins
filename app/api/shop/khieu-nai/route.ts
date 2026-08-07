import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  listKhieuNaiForUser,
  listKhieuNaiTheoDon,
  moKhieuNai,
} from "@/lib/shop/khieu-nai";

/** GET /api/shop/khieu-nai?donId= — list theo đơn hoặc của user. */
export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const donId = new URL(request.url).searchParams.get("donId")?.trim();
  try {
    if (donId) {
      const items = await listKhieuNaiTheoDon(session.profile.id, donId);
      return NextResponse.json({ items });
    }
    const items = await listKhieuNaiForUser(session.profile.id, "either");
    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy đơn." }, { status: 404 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
    }
    return NextResponse.json({ error: "Không tải khiếu nại." }, { status: 500 });
  }
}

/** POST /api/shop/khieu-nai — buyer mở khiếu nại. */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: {
    idDonHang?: unknown;
    lyDo?: unknown;
    moTa?: unknown;
    anhUrl?: unknown;
    anhId?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  try {
    const kn = await moKhieuNai(session.profile.id, {
      idDonHang: typeof body.idDonHang === "string" ? body.idDonHang : "",
      lyDo: typeof body.lyDo === "string" ? body.lyDo : "",
      moTa: typeof body.moTa === "string" ? body.moTa : null,
      anhUrl: typeof body.anhUrl === "string" ? body.anhUrl : null,
      anhId: typeof body.anhId === "string" ? body.anhId : null,
    });
    return NextResponse.json({ khieuNai: kn }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Không tìm thấy đơn."],
      FORBIDDEN: [403, "Chỉ người mua của đơn mới mở khiếu nại."],
      INVALID_STATE: [422, "Trạng thái đơn không cho mở khiếu nại."],
      LY_DO_INVALID: [422, "Lý do khiếu nại không hợp lệ."],
      ALREADY_OPEN: [422, "Đơn này đã có khiếu nại đang mở."],
      RATE_LIMIT: [429, "Bạn đang có quá nhiều khiếu nại mở. Hãy chờ xử lý xong."],
      CREATE_FAILED: [500, "Không tạo được khiếu nại."],
    };
    const hit = map[msg];
    if (hit) return NextResponse.json({ error: hit[1] }, { status: hit[0] });
    console.error("[api] khieu-nai", e);
    return NextResponse.json({ error: "Không tạo khiếu nại." }, { status: 500 });
  }
}
