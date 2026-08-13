import { NextResponse } from "next/server";

import { listQuaySapCoMat } from "@/lib/shop/quay";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET ?slug= — sự kiện sắp/đang diễn ra mà shop (owner slug) đã được duyệt quầy.
 * Công khai — mặt tiền storefront.
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Thiếu slug." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: user } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();

  if (!user) {
    return NextResponse.json({ items: [] });
  }

  const items = await listQuaySapCoMat(user.id);
  return NextResponse.json({ items });
}
