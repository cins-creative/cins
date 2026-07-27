import { NextResponse } from "next/server";

import { classifyEmbedUrl } from "@/lib/editor/embed-providers";
import { fetchVimeoOEmbedDimensions } from "@/lib/editor/resolve-embed-thumbnail-server";
import { isSafePublicHttpUrl } from "@/lib/link/og-preview";

/**
 * GET /api/embed/dimensions?url=
 * Kích thước thật của video embed (hiện chỉ Vimeo qua oEmbed) — để render khung
 * theo đúng tỉ lệ gốc. Metadata công khai nên không cần đăng nhập; chặn SSRF
 * bằng `isSafePublicHttpUrl` + nhận diện provider.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url")?.trim() || "";
  if (!raw || !isSafePublicHttpUrl(raw)) {
    return NextResponse.json({ error: "URL không hợp lệ." }, { status: 400 });
  }

  const cls = classifyEmbedUrl(raw);
  if (cls?.provider !== "vimeo") {
    return NextResponse.json({ error: "Chỉ hỗ trợ Vimeo." }, { status: 422 });
  }

  const dims = await fetchVimeoOEmbedDimensions(cls.url);
  if (!dims) {
    return NextResponse.json(
      { error: "Không đọc được kích thước." },
      { status: 404 },
    );
  }

  return NextResponse.json(dims, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
