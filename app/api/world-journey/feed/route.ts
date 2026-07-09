import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { WORLD_JOURNEY_FEED_PAGE_SIZE } from "@/lib/cins/worldJourneyFeedConstants";
import { fetchWorldJourneyFeedPage } from "@/lib/cins/worldJourneyFeedFetch";

export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const limitRaw = Number(searchParams.get("limit") ?? WORLD_JOURNEY_FEED_PAGE_SIZE);
  const limit = Number.isFinite(limitRaw)
    ? limitRaw
    : WORLD_JOURNEY_FEED_PAGE_SIZE;

  const page = await fetchWorldJourneyFeedPage(
    session.profile.id,
    offset,
    limit,
  );

  return NextResponse.json(page);
}
