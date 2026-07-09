import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchGalleryMainPage } from "@/lib/journey/gallery-page-fetch";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = Promise<{ slug: string }>;

export async function GET(
  request: Request,
  context: { params: Params },
) {
  const session = await getCurrentSessionAndProfile();

  const { slug } = await context.params;
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);

  const admin = createServiceRoleClient();
  const { data: owner, error } = await admin
    .from("user_nguoi_dung")
    .select("id, giai_doan")
    .eq("slug", slug)
    .maybeSingle<{ id: string; giai_doan: string | null }>();

  if (error || !owner || owner.giai_doan === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const page = await fetchGalleryMainPage({
    userId: owner.id,
    ownerSlug: slug,
    viewerId: session?.profile?.id ?? null,
    offset,
  });

  return NextResponse.json(page);
}
