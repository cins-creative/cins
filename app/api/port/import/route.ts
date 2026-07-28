import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  applyPortImport,
  buildPortPreview,
  type PortImportPreview,
  type PortPlatform,
} from "@/lib/port/import";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_HTML_BYTES = 6_000_000;
const PLATFORMS: readonly PortPlatform[] = ["behance", "artstation"];

/**
 * POST /api/port/import
 * Body: { platform: "behance"|"artstation", url: string, html?: string, apply?: boolean, preview?: PortImportPreview }
 *
 * - apply=false (mặc định): dựng preview (mirror ảnh CF + blocks).
 * - apply=true: tạo bài Journey riêng tư (che_do_hien_thi='chi_minh') để user duyệt.
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  let body: {
    platform?: unknown;
    url?: unknown;
    html?: unknown;
    apply?: unknown;
    preview?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const platform = (
    typeof body.platform === "string" ? body.platform : "behance"
  ) as PortPlatform;
  if (!PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: "Nền tảng chưa hỗ trợ (Behance / ArtStation)." },
      { status: 400 },
    );
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const apply = body.apply === true;

  try {
    let preview: PortImportPreview;

    if (apply && body.preview && typeof body.preview === "object") {
      preview = body.preview as PortImportPreview;
      if (!Array.isArray(preview.blocks) || preview.blocks.length === 0) {
        return NextResponse.json(
          { error: "Preview không hợp lệ." },
          { status: 422 },
        );
      }
    } else {
      const html = typeof body.html === "string" ? body.html : "";
      if (!html) {
        return NextResponse.json(
          { error: "Thiếu nội dung project (html)." },
          { status: 400 },
        );
      }
      if (html.length > MAX_HTML_BYTES) {
        return NextResponse.json(
          { error: "Nội dung project quá lớn." },
          { status: 413 },
        );
      }
      preview = await buildPortPreview({ platform, url, html });
    }

    if (!apply) {
      return NextResponse.json({ ok: true, preview });
    }

    const result = await applyPortImport({
      idNguoiDung: session.profile.id,
      slugChu: session.profile.slug,
      preview,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(
      { ok: true, duongDan: result.duongDan, slugBai: result.slugBai, preview },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi import portfolio.";
    console.error("[api/port/import]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
