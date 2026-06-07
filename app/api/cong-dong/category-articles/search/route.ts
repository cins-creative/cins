import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { searchCongDongCategoryArticles } from "@/lib/cong-dong/categories";

/** GET /api/cong-dong/category-articles/search?q= — nghề + ngành published */
export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const loaiRaw = url.searchParams.get("loai")?.trim();
  const loai =
    loaiRaw === "nghe" || loaiRaw === "nganh_dao_tao" ? loaiRaw : "all";
  const items = await searchCongDongCategoryArticles(q, 16, loai);
  return NextResponse.json({ items });
}
