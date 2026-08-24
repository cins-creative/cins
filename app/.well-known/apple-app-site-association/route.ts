import { NextResponse } from "next/server";

import {
  buildAppleAppSiteAssociation,
  WELL_KNOWN_CACHE,
} from "@/lib/deeplink/well-known";

/**
 * GET /.well-known/apple-app-site-association
 * iOS Universal Links — không đuôi .json, Content-Type application/json.
 */
export async function GET() {
  const body = buildAppleAppSiteAssociation();
  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": WELL_KNOWN_CACHE,
    },
  });
}
