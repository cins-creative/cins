import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { searchCongDongCategoryArticles } from "@/lib/cong-dong/categories";

/** GET /api/cong-dong/category-articles/search?q= — ngành đào tạo published */
export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const loaiRaw = url.searchParams.get("loai")?.trim();
  const limitRaw = Number(url.searchParams.get("limit") ?? "16");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
    : 16;
  // Cộng đồng chỉ gắn ngành (không còn nghề). `loai=nghe` → rỗng.
  const loai =
    loaiRaw === "nganh_dao_tao"
      ? "nganh_dao_tao"
      : loaiRaw === "nghe"
        ? "nghe"
        : "all";
  const items =
    loai === "nghe"
      ? []
      : await searchCongDongCategoryArticles(
          q,
          limit,
          loai === "nganh_dao_tao" ? "nganh_dao_tao" : "all",
        );
  return NextResponse.json({ items });
}
