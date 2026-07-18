import { NextResponse } from "next/server";

import { listSuKienForListing } from "@/lib/to-chuc/su-kien-listing";

export async function GET(request: Request) {
  const limitRaw = new URL(request.url).searchParams.get("limit");
  const limit = Math.min(
    Math.max(Number.parseInt(limitRaw ?? "40", 10) || 40, 1),
    80,
  );
  try {
    const all = await listSuKienForListing();
    const items = all.slice(0, limit).map((ev) => ({
      id: ev.id,
      ten: ev.ten,
      orgTen: ev.orgTen,
    }));
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[su-kien/list]", e);
    return NextResponse.json({ items: [] });
  }
}
