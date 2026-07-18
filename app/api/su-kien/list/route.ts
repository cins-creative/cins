import { NextResponse } from "next/server";

import { listSuKienForListing } from "@/lib/to-chuc/su-kien-listing";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.min(
    Math.max(Number.parseInt(limitRaw ?? "40", 10) || 40, 1),
    80,
  );
  const upcomingOnly = url.searchParams.get("upcoming") === "1";

  try {
    const all = await listSuKienForListing();
    const filtered = upcomingOnly
      ? all.filter(
          (ev) => ev.status === "upcoming" || ev.status === "active",
        )
      : all;
    const items = filtered.slice(0, limit).map((ev) => {
      const coverSrc =
        (ev.coverId
          ? resolveTruongImageSrcSync(ev.coverId, [
              "public",
              "cover",
              "medium",
              "grid",
            ])
          : null) ??
        ev.coverSrc ??
        null;
      return {
        id: ev.id,
        ten: ev.ten,
        orgTen: ev.orgTen,
        batDau: ev.batDau,
        status: ev.status,
        coverSrc,
        orgAvatarUrl: ev.orgAvatarUrl,
      };
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[su-kien/list]", e);
    return NextResponse.json({ items: [] });
  }
}
