import { NextResponse } from "next/server";

import { listLinhVucForHub } from "@/lib/career/queries";

/** GET /api/meta/linh-vuc — danh mục lĩnh vực cho form tuyển dụng. */
export async function GET() {
  const rows = await listLinhVucForHub();
  const items = rows.map((row) => ({
    id: row.id,
    ten: row.ten_vi?.trim() || row.ten_en?.trim() || row.slug || row.id,
    slug: row.slug,
  }));
  return NextResponse.json({ items });
}
