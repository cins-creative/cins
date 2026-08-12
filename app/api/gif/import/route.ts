import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  GIF_IMPORT_RATE_MAX,
  GIF_IMPORT_RATE_WINDOW_MS,
} from "@/lib/gif/constants";
import { importGifUrlToCloudflare } from "@/lib/gif/import-to-cloudflare";
import { gifRateLimited } from "@/lib/gif/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LY_DO_MESSAGE: Record<string, string> = {
  url_khong_hop_le: "URL GIF không được phép.",
  url_khong_an_toan: "URL GIF không an toàn.",
  tai_that_bai: "Không tải được GIF.",
  dinh_dang_khong_ho_tro: "Định dạng GIF không hỗ trợ.",
  qua_lon: "GIF quá nặng để lưu.",
  luu_tru_that_bai: "Không lưu được GIF lên Cloudflare.",
};

/** POST /api/gif/import — body `{ url, id? }` → mirror CF Images. */
export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  if (
    gifRateLimited(
      `gif:import:${session.profile.id}`,
      GIF_IMPORT_RATE_MAX,
      GIF_IMPORT_RATE_WINDOW_MS,
    )
  ) {
    return NextResponse.json(
      { error: "Bạn gửi GIF quá nhanh. Đợi một phút rồi thử lại." },
      { status: 429 },
    );
  }

  let body: { url?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url : "";
  if (!url.trim()) {
    return NextResponse.json({ error: "Thiếu url GIF." }, { status: 400 });
  }

  const result = await importGifUrlToCloudflare(url);
  if (!result.ok) {
    const status =
      result.lyDo === "url_khong_hop_le" || result.lyDo === "url_khong_an_toan"
        ? 400
        : result.lyDo === "qua_lon"
          ? 413
          : 502;
    return NextResponse.json(
      {
        error: LY_DO_MESSAGE[result.lyDo] ?? "Không import được GIF.",
        lyDo: result.lyDo,
      },
      { status },
    );
  }

  return NextResponse.json({
    imageId: result.imageId,
    url: result.url,
    ...(typeof body.id === "string" && body.id.trim()
      ? { sourceId: body.id.trim() }
      : {}),
  });
}
