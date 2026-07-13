import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Danh sách slug tài khoản đã xác minh (tick xanh). Số ít, đổi chậm →
 * cache mạnh để mọi chip/popover chỉ tải 1 lần rồi tra cục bộ.
 */
export const revalidate = 300;

export async function GET() {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select("slug")
    .eq("da_xac_minh", true)
    .returns<Array<{ slug: string }>>();

  if (error) {
    return NextResponse.json({ slugs: [] }, { status: 200 });
  }

  const slugs = (data ?? [])
    .map((row) => row.slug)
    .filter((slug): slug is string => Boolean(slug));

  return NextResponse.json(
    { slugs },
    {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
