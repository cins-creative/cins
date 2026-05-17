import { NextResponse } from "next/server";

import { pickImageDeliveryUrl } from "@/lib/cloudflare/pick-image-delivery-url";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

const MAX_BYTES = 12 * 1024 * 1024;
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
 * POST multipart: file, careerId (UUID nn_nghe_nghiep)
 * Header: Authorization: Bearer <CAREER_THUMB_UPLOAD_TOKEN>
 *
 * Env server:
 * - CAREER_THUMB_UPLOAD_TOKEN
 * - CLOUDFLARE_ACCOUNT_ID
 * - CLOUDFLARE_IMAGES_API_TOKEN (quyền Account → Cloudflare Images → Edit)
 * - CLOUDFLARE_IMAGES_VARIANT (tùy chọn) — ưu tiên variant URL sau upload
 * - SUPABASE_SERVICE_ROLE_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 */
export async function POST(request: Request) {
  const token = process.env.CAREER_THUMB_UPLOAD_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Chưa cấu hình CAREER_THUMB_UPLOAD_TOKEN" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!bearer || bearer !== token) {
    return unauthorized();
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Thiếu SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 },
    );
  }

  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN;
  if (!cfAccount || !cfToken) {
    return NextResponse.json(
      {
        error:
          "Thiếu CLOUDFLARE_ACCOUNT_ID hoặc CLOUDFLARE_IMAGES_API_TOKEN",
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

  const careerIdRaw = form.get("careerId");
  const file = form.get("file");

  if (typeof careerIdRaw !== "string" || !careerIdRaw.trim()) {
    return badRequest("Thiếu careerId");
  }
  const careerId = careerIdRaw.trim();

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

  const supabase = createServiceRoleClient();
  const { data: row, error: upErr } = await supabase
    .from("nn_nghe_nghiep")
    .update({ thumbnail_mascot: imageUrl })
    .eq("id", careerId)
    .select("id")
    .maybeSingle();

  if (upErr) {
    return NextResponse.json(
      { error: `Supabase: ${upErr.message}` },
      { status: 502 },
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: "Không tìm thấy nghề với id đã gửi" },
      { status: 404 },
    );
  }

  return NextResponse.json({ url: imageUrl, careerId });
}
