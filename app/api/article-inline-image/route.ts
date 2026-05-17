import { NextResponse } from "next/server";

import { pickImageDeliveryUrl } from "@/lib/cloudflare/pick-image-delivery-url";
import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * POST multipart: `file` — upload lên Cloudflare Images, trả URL (imagedelivery.net).
 *
 * Chỉ bật khi chế độ sửa bài inline được phép (`NODE_ENV=development` hoặc `CINS_INLINE_ARTICLE_EDIT=1`).
 *
 * Env server:
 * - `ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN` (bí mật)
 * - `NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN` — đặt **cùng giá trị** (chỉ dev / nội bộ; đừng dùng production công khai)
 * - `CLOUDFLARE_ACCOUNT_ID`
 * - `CLOUDFLARE_IMAGES_API_TOKEN` (Account → Cloudflare Images → Edit)
 * - `CLOUDFLARE_IMAGES_ARTICLE_VARIANT` (tùy chọn) — tên variant độ phân giải cao trong dashboard
 */
export async function POST(request: Request) {
  if (!isInlineArticleEditEnabled()) {
    return NextResponse.json(
      { error: "Tải ảnh inline đã tắt trên môi trường này." },
      { status: 403 },
    );
  }

  const token = process.env.ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Chưa cấu hình ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN (và NEXT_PUBLIC_* trùng giá trị trên client).",
      },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!bearer || bearer !== token) {
    return unauthorized();
  }

  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN;
  if (!cfAccount || !cfToken) {
    return NextResponse.json(
      {
        error: "Thiếu CLOUDFLARE_ACCOUNT_ID hoặc CLOUDFLARE_IMAGES_API_TOKEN",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Không đọc được form");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return badRequest("Thiếu file ảnh");
  }

  if (file.size > MAX_BYTES) {
    return badRequest(`Ảnh quá lớn (tối đa ${MAX_BYTES / (1024 * 1024)} MB)`);
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(mime)) {
    return badRequest("Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF");
  }

  const cfForm = new FormData();
  cfForm.append("file", file, file.name || "upload");

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/images/v1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfToken}`,
      },
      body: cfForm,
    },
  );

  const cfJson: unknown = await cfRes.json().catch(() => null);
  if (!cfRes.ok) {
    const msg =
      typeof cfJson === "object" &&
      cfJson !== null &&
      "errors" in cfJson &&
      Array.isArray((cfJson as { errors: unknown }).errors)
        ? JSON.stringify((cfJson as { errors: unknown }).errors)
        : cfRes.statusText;
    return NextResponse.json(
      { error: `Cloudflare Images: ${msg}` },
      { status: 502 },
    );
  }

  const payload = cfJson as {
    success?: boolean;
    result?: { variants?: string[] };
  };

  const variants = payload.result?.variants;
  const imageUrl = pickImageDeliveryUrl(variants);

  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json(
      { error: "Cloudflare không trả URL ảnh (variants)" },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: imageUrl });
}
