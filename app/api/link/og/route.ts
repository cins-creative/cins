import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  fetchCinsInternalLinkPreview,
  isCinsSiteUrl,
} from "@/lib/link/cins-internal-preview";
import {
  fetchLinkOgPreview,
  isSafePublicHttpUrl,
  type LinkOgPreview,
} from "@/lib/link/og-preview";

/** Cache tạm trong isolate (Workers) — giảm scrape / resolve lặp. */
const memoryCache = new Map<
  string,
  { at: number; value: LinkOgPreview | null }
>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 200;
/** Bump khi đổi shape preview (vd. kind / avatar bài viết) để bỏ cache cũ. */
const CACHE_VER = "v7";

/** Preview bài thiếu ảnh hoặc còn URL CF flexible crop — không giữ cache. */
function isStalePostPreview(preview: LinkOgPreview | null): boolean {
  if (!preview?.title || preview.source !== "cins") return false;
  const isPost =
    preview.kind === "bai_viet" ||
    (() => {
      try {
        return /^\/[^/]+\/p\/[^/]+\/?$/.test(new URL(preview.url).pathname);
      } catch {
        return false;
      }
    })();
  if (!isPost) return false;
  const image = preview.image?.trim() || "";
  if (!image) return true;
  return /imagedelivery\.net\/[^/]+\/[^/]+\/w=\d+/i.test(image);
}

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const raw = new URL(req.url).searchParams.get("url")?.trim() || "";
  if (!raw) {
    return NextResponse.json({ error: "Thiếu url." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ error: "URL không hợp lệ." }, { status: 400 });
  }

  const cinsInternal = isCinsSiteUrl(parsed);
  /* localhost / LAN chỉ được qua khi khớp SITE_URL (resolve DB, không scrape). */
  if (!cinsInternal && !isSafePublicHttpUrl(raw)) {
    return NextResponse.json({ error: "URL không hợp lệ." }, { status: 400 });
  }

  const key = `${CACHE_VER}:${parsed.href}`;

  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    if (!cached.value) {
      return NextResponse.json(
        { error: "Không lấy được preview." },
        { status: 404 },
      );
    }
    if (!isStalePostPreview(cached.value)) {
      return NextResponse.json(cached.value, {
        headers: { "Cache-Control": "private, max-age=3600" },
      });
    }
    memoryCache.delete(key);
  }

  /* CINs nội bộ: resolve DB (avatar/cover/meta) — không scrape HTML.
   * Truyền `parsed.href` (không phải cache key `v2:…`) — URL() cần protocol http(s). */
  const internal = await fetchCinsInternalLinkPreview(parsed.href);
  const preview =
    internal ??
    (cinsInternal ? null : await fetchLinkOgPreview(parsed.href));

  if (memoryCache.size >= CACHE_MAX) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  /* Không cache preview bài thiếu ảnh — tránh kẹt bản lỗi 30 phút. */
  if (!isStalePostPreview(preview)) {
    memoryCache.set(key, { at: Date.now(), value: preview });
  }

  if (!preview) {
    return NextResponse.json(
      { error: "Không lấy được preview." },
      { status: 404 },
    );
  }

  return NextResponse.json(preview, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}
