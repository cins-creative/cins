import { NextResponse } from "next/server";

import {
  isOrgSlugTaken,
  validateOrgSlug,
} from "@/lib/cong-dong/org-slug";

/** GET /api/to-chuc/slug?slug=... — kiểm tra slug org_to_chuc. */
export async function GET(req: Request) {
  const slugParam = new URL(req.url).searchParams.get("slug") ?? "";
  const validation = validateOrgSlug(slugParam);
  if (!validation.ok) {
    return NextResponse.json({
      available: false,
      error: validation.error,
    });
  }

  const taken = await isOrgSlugTaken(validation.slug);
  return NextResponse.json({
    available: !taken,
    slug: validation.slug,
    error: taken ? "Đường dẫn này đã có người dùng." : undefined,
  });
}
