import { uploadCloudflareImageFromUrlChiTiet } from "@/lib/cloudflare/upload-image-from-url";
import { isAllowedGifCdnUrl } from "@/lib/gif/allowlist";

export type GifImportResult =
  | { ok: true; imageId: string; url: string }
  | {
      ok: false;
      lyDo:
        | "url_khong_hop_le"
        | "url_khong_an_toan"
        | "tai_that_bai"
        | "dinh_dang_khong_ho_tro"
        | "qua_lon"
        | "luu_tru_that_bai";
      soByte?: number;
    };

export async function importGifUrlToCloudflare(
  rawUrl: string,
): Promise<GifImportResult> {
  const url = rawUrl.trim();
  if (!url || !isAllowedGifCdnUrl(url)) {
    return { ok: false, lyDo: "url_khong_hop_le" };
  }

  const uploaded = await uploadCloudflareImageFromUrlChiTiet(url);
  if (!uploaded.ok) {
    return {
      ok: false,
      lyDo: uploaded.lyDo,
      ...(uploaded.soByte != null ? { soByte: uploaded.soByte } : {}),
    };
  }
  return {
    ok: true,
    imageId: uploaded.data.imageId,
    url: uploaded.data.url,
  };
}
