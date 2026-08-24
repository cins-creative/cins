import { NextResponse } from "next/server";

import { buildAssetLinks, WELL_KNOWN_CACHE } from "@/lib/deeplink/well-known";

/**
 * GET /.well-known/assetlinks.json
 * Android App Links Digital Asset Links.
 */
export async function GET() {
  const body = buildAssetLinks();
  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": WELL_KNOWN_CACHE,
    },
  });
}
