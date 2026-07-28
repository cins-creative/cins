/**
 * Ghép album ảnh Pixiv (ajax illust + pages → CF Images → khối `imgs`).
 * Dùng chung cho API đăng bài (`/api/noi-bo/tac-pham/dang`) và API sửa bài
 * Pixiv cũ về album (`/api/noi-bo/tac-pham/sua-pixiv-album`).
 *
 * Reject: R18 / ugoira / ảnh quá dài (strip) → trả `code`. Fetch fail → null.
 */

import "server-only";

import {
  layAnhPixivTuUrl,
  pixivImageFetchHeaders,
} from "@/lib/autopilot/pixiv-assets";
import { uploadCloudflareImageFromUrl } from "@/lib/cloudflare/upload-image-from-url";
import {
  taoKhoiBaiAlbumNguon,
  type AnhAlbumNguon,
} from "@/lib/editor/khoi-bai-nguon";
import type { Block } from "@/lib/editor/types";

export type PixivAlbumBlocksResult =
  | {
      blocks: Block[];
      coverId: string | null;
      tieuDeGoiY?: string | null;
      moTaGoiY?: string | null;
    }
  | { code: "anh_qua_dai" | "r18" | "ugoira"; error: string }
  | null;

/**
 * Fetch ajax Pixiv → upload CF (Referer pximg) → album.
 * Fail / reject → code hoặc null.
 */
export async function buildPixivAlbumBlocks(params: {
  urlNguon: string;
  tenTacGiaNguon?: string | null;
  dongGhiNguon?: string | null;
  choPhepAnhQuaDai?: boolean;
}): Promise<PixivAlbumBlocksResult> {
  const fetched = await layAnhPixivTuUrl(params.urlNguon, {
    choPhepAnhQuaDai: params.choPhepAnhQuaDai,
  });
  if (!fetched.ok) {
    if (
      fetched.code === "anh_qua_dai" ||
      fetched.code === "r18" ||
      fetched.code === "ugoira"
    ) {
      return { code: fetched.code, error: fetched.error };
    }
    return null;
  }

  const imgHeaders = pixivImageFetchHeaders();
  const anh: AnhAlbumNguon[] = [];
  let coverId: string | null = null;

  for (const item of fetched.data.anh) {
    try {
      const uploaded = await uploadCloudflareImageFromUrl(item.imageUrl, {
        headers: imgHeaders,
      });
      if (!uploaded?.imageId) continue;
      anh.push({
        seed: uploaded.imageId,
        width: item.width,
        height: item.height,
      });
      if (!coverId) coverId = uploaded.imageId;
    } catch {
      /* bỏ ảnh lỗi */
    }
  }

  if (!anh.length) return null;

  /*
   * Ưu tiên userName ajax (chuẩn theo từng artwork) hơn tên từ extension — vì
   * quét tự do trên pixiv (trang chung) thường bắt sai tên (vd. "Online
   * community for artists"). Không có userName → không tiêu đề.
   */
  const userName = fetched.data.userName?.trim() || null;
  const tenTacGia = userName || params.tenTacGiaNguon?.trim() || null;
  const moTaKhoi = fetched.data.descriptionPlain?.slice(0, 2000) || null;

  return {
    blocks: taoKhoiBaiAlbumNguon({
      anh,
      moTa: null,
      urlNguon: params.urlNguon,
      nenTang: "pixiv",
      tenTacGiaNguon: tenTacGia,
      dongGhiNguon: params.dongGhiNguon,
    }),
    coverId,
    /* Tiêu đề Pixiv = «Tham khảo {tên artist}» (ajax); không có tên → trống. */
    tieuDeGoiY: userName ? `Tham khảo ${userName}` : "",
    moTaGoiY: moTaKhoi,
  };
}
