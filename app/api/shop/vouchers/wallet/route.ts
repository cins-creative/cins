import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listVoucherVi, luuVoucherVi } from "@/lib/shop/voucher";

/** GET /api/shop/voucher/vi — ví voucher buyer. */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const items = await listVoucherVi(session.profile.id);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Không tải được ví." }, { status: 500 });
  }
}

/** POST /api/shop/voucher/vi — lưu voucher vào ví. Body: { idVoucher } */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: { idVoucher?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (typeof body.idVoucher !== "string" || !body.idVoucher.trim()) {
    return NextResponse.json({ error: "Thiếu voucher." }, { status: 422 });
  }
  try {
    await luuVoucherVi(session.profile.id, body.idVoucher.trim());
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "VOUCHER_KHONG_TON_TAI") {
      return NextResponse.json(
        { error: "Voucher không còn công khai." },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: "Không lưu được." }, { status: 500 });
  }
}
