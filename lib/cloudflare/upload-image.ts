import { pickImageDeliveryUrl } from "@/lib/cloudflare/pick-image-delivery-url";
import {
  inferImageMime,
  UPLOAD_IMAGE_MIMES,
} from "@/lib/files/infer-image-mime";

const MAX_BYTES = 8 * 1024 * 1024;

export type CloudflareUploadResult = {
  imageId: string;
  url: string;
};

export async function uploadToCloudflareImages(
  file: File,
): Promise<{ ok: true; data: CloudflareUploadResult } | { ok: false; error: string }> {
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN;
  if (!cfAccount || !cfToken) {
    return { ok: false, error: "Missing Cloudflare credentials" };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File too large" };
  }

  const mime = inferImageMime(file);
  if (!UPLOAD_IMAGE_MIMES.has(mime)) {
    return {
      ok: false,
      error: "Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.",
    };
  }

  const cfForm = new FormData();
  const uploadFile =
    file.type === mime
      ? file
      : new File([file], file.name || "upload", { type: mime });
  cfForm.append("file", uploadFile, uploadFile.name || "upload");

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/images/v1`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${cfToken}` },
      body: cfForm,
    },
  );

  const cfJson = (await cfRes.json().catch(() => null)) as {
    success?: boolean;
    result?: { id?: string; variants?: string[] };
    errors?: unknown;
  };

  if (!cfRes.ok || !cfJson.success) {
    return {
      ok: false,
      error: cfRes.ok ? "Upload failed" : JSON.stringify(cfJson.errors ?? cfRes.statusText),
    };
  }

  const imageId = cfJson.result?.id?.trim();
  const url = pickImageDeliveryUrl(cfJson.result?.variants);
  if (!imageId || !url) {
    return { ok: false, error: "No image id/url from Cloudflare" };
  }

  return { ok: true, data: { imageId, url } };
}
