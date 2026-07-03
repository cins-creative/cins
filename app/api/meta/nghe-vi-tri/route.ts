import { NextResponse } from "next/server";

import { loadStudioNgheOptions } from "@/lib/to-chuc/studio-nghe-options";

/** GET /api/meta/nghe-vi-tri — danh mục nghề (vị trí công việc) cho form tuyển dụng. */
export async function GET() {
  const items = await loadStudioNgheOptions();
  return NextResponse.json({ items });
}
