import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  fetchLinkOgPreview,
  isSafePublicHttpUrl,
} from "@/lib/link/og-preview";

/** Cache tạm trong isolate (Workers) — giảm scrape lặp. */
const memoryCache = new Map<
  string,
  { at: number; value: Awaited<ReturnType<typeof fetchLinkOgPreview>> }
>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 200;

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const raw = new URL(req.url).searchParams.get("url")?.trim() || "";
  if (!raw) {
    return NextResponse.json({ error: "Thiếu url." }, { status: 400 });
  }
  if (!isSafePublicHttpUrl(raw)) {
    return NextResponse.json({ error: "URL không hợp lệ." }, { status: 400 });
  }

  let key: string;
  try {
    key = new URL(raw).href;
  } catch {
    return NextResponse.json({ error: "URL không hợp lệ." }, { status: 400 });
  }

  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    if (!cached.value) {
      return NextResponse.json({ error: "Không lấy được preview." }, { status: 404 });
    }
    return NextResponse.json(cached.value, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  }

  const preview = await fetchLinkOgPreview(key);
  if (memoryCache.size >= CACHE_MAX) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { at: Date.now(), value: preview });

  if (!preview) {
    return NextResponse.json({ error: "Không lấy được preview." }, { status: 404 });
  }

  return NextResponse.json(preview, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}
