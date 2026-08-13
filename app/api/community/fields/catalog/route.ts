import { NextResponse } from "next/server";

import { listCongDongLinhVucCatalog } from "@/lib/cong-dong/linh-vuc";

/** GET /api/cong-dong/linh-vuc/catalog — danh sách lĩnh vực cho picker. */
export async function GET() {
  const items = await listCongDongLinhVucCatalog();
  return NextResponse.json({ items });
}
