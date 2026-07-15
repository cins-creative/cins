import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { classifyEmbedUrl } from "@/lib/editor/embed-providers";
import { fetchEmbedThumbnailUrl } from "@/lib/editor/resolve-embed-thumbnail-server";
import { isSafePublicHttpUrl } from "@/lib/link/og-preview";

/**
 * GET /api/embed/thumbnail?url=
 * Preview thumbnail embed lúc compose — YouTube sync / oEmbed / OG.
 */
export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const raw = new URL(req.url).searchParams.get("url")?.trim() || "";
  if (!raw || !isSafePublicHttpUrl(raw)) {
    return NextResponse.json({ error: "URL không hợp lệ." }, { status: 400 });
  }

  const cls = classifyEmbedUrl(raw);
  if (!cls || cls.provider === "behance") {
    return NextResponse.json(
      { error: "Không nhận diện được nền tảng embed." },
      { status: 422 },
    );
  }

  if (cls.provider === "rive-file" || cls.provider === "lottie-file") {
    return NextResponse.json(
      { error: "File .riv/.lottie dùng capture canvas, không scrape URL." },
      { status: 422 },
    );
  }

  const imageUrl = await fetchEmbedThumbnailUrl(cls.provider, cls.url);
  if (!imageUrl) {
    return NextResponse.json(
      { error: "Không lấy được thumbnail." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      url: imageUrl,
      provider: cls.provider,
    },
    {
      headers: { "Cache-Control": "private, max-age=3600" },
    },
  );
}
