import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { GALLERY_SCROLL_PAGE_SIZE } from "@/lib/journey/gallery-page-fetch";
import { fetchWorldJourneyGalleryPage } from "@/lib/cins/worldJourneyGalleryFetch";

export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const limitRaw = Number(
    searchParams.get("limit") ?? GALLERY_SCROLL_PAGE_SIZE,
  );
  const limit = Number.isFinite(limitRaw) ? limitRaw : GALLERY_SCROLL_PAGE_SIZE;

  const page = await fetchWorldJourneyGalleryPage(
    session.profile.id,
    offset,
    limit,
  );

  return NextResponse.json(page);
}
