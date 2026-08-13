import { NextResponse } from "next/server";

import { getPhuongXaByTinh } from "@/lib/vn/phuong-xa";

/** Dữ liệu công khai (hằng số) — cache mạnh, không cần đăng nhập. */
export async function GET(request: Request) {
  const tinh = new URL(request.url).searchParams.get("tinh");
  const items = getPhuongXaByTinh(tinh);
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
  );
}
