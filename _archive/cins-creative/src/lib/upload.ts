const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 8 * 1024 * 1024;

export type UploadedImage = {
  cloudflareId: string;
  width: number | null;
  height: number | null;
};

export async function uploadImageToCloudflare(file: File): Promise<UploadedImage> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Chỉ nhận JPEG, PNG, WebP hoặc GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Ảnh tối đa 8MB.");
  }

  const res = await fetch("/api/cf-upload-url", { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Không lấy được URL upload.");
  }
  const { id, uploadURL } = (await res.json()) as {
    id: string;
    uploadURL: string;
  };

  const form = new FormData();
  form.append("file", file);
  const up = await fetch(uploadURL, { method: "POST", body: form });
  if (!up.ok) {
    throw new Error("Upload Cloudflare thất bại. Thử lại.");
  }

  let width: number | null = null;
  let height: number | null = null;
  try {
    const bmp = await createImageBitmap(file);
    width = bmp.width;
    height = bmp.height;
    bmp.close();
  } catch {
    // optional dimensions
  }

  return { cloudflareId: id, width, height };
}
