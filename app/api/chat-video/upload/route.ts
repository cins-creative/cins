import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  ensureChatVideoMediaId,
  withinChatVideoDailyLimit,
} from "@/lib/chat/chat-video-media";
import { buildChatVideoUrl } from "@/lib/chat/video-url";
import {
  buildChatVideoObjectKey,
  chatVideoObjectExists,
  MAX_CHAT_VIDEO_BYTES,
  putChatVideoObject,
} from "@/lib/cloudflare/r2-chat-video";

/* POST /api/chat-video/upload — nhận video clip đã nén phía client, lưu R2
   (dedup theo content-hash) và tạo content_media(loai_media='video'). */

const ALLOWED_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const EXT_MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

function resolveUploadMime(file: File): string | null {
  const typed = file.type.trim().toLowerCase();
  if (ALLOWED_MIME.has(typed)) return typed;
  const ext = file.name.split(".").pop()?.trim().toLowerCase() || "";
  return EXT_MIME[ext] ?? null;
}

function parseDim(value: FormDataEntryValue | null): number | null {
  const n = typeof value === "string" ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }
  const viewerId = session.profile.id;

  if (!(await withinChatVideoDailyLimit(viewerId))) {
    return NextResponse.json(
      { error: "Bạn đã gửi quá nhiều video hôm nay. Thử lại sau." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form không hợp lệ." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Thiếu file video." }, { status: 400 });
  }
  const mime = resolveUploadMime(file);
  if (!mime) {
    return NextResponse.json(
      { error: "Định dạng video không hỗ trợ (chỉ MP4/WebM/MOV)." },
      { status: 415 },
    );
  }
  if (file.size > MAX_CHAT_VIDEO_BYTES) {
    return NextResponse.json(
      { error: "Video vượt giới hạn dung lượng — hãy nén lại." },
      { status: 413 },
    );
  }

  const width = parseDim(form.get("width"));
  const height = parseDim(form.get("height"));
  const durationS = parseDim(form.get("duration_s"));

  const buffer = await file.arrayBuffer();
  const hash = await sha256Hex(buffer);
  const key = buildChatVideoObjectKey(hash);

  /* Dedup: bỏ PUT nếu object đã có (chỉ khả dụng qua binding). */
  const exists = await chatVideoObjectExists(key);
  if (!exists) {
    const put = await putChatVideoObject(key, buffer, mime);
    if (!put.ok) {
      return NextResponse.json({ error: put.error }, { status: 502 });
    }
  }

  const mediaId = await ensureChatVideoMediaId({
    r2Key: key,
    viewerId,
    width,
    height,
    durationS,
  });
  if (!mediaId) {
    return NextResponse.json(
      { error: "Không lưu được video đính kèm." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    mediaId,
    key,
    url: buildChatVideoUrl(key),
    width,
    height,
    durationS,
  });
}
