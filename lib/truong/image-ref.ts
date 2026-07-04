import type { Block } from "@/lib/editor/types";
import { extractCfImageIdFromDeliveryUrl } from "@/lib/cloudflare/image-id-from-url";

const CF_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Preview tạm trong trình duyệt — không lưu DB, không bọc qua Cloudflare. */
export function isTemporaryImageRef(value: string): boolean {
  return value.startsWith("blob:") || value.startsWith("data:");
}

/**
 * Ô ảnh trống vừa thêm (chưa chọn/upload ảnh) — seed dạng `new-...`.
 * Không được resolve thành picsum dummy; render như placeholder rỗng.
 */
export function isPlaceholderImageSeed(value: string): boolean {
  return /^new-/.test(value.trim());
}

/** URL http(s) đầy đủ — ảnh gốc từ web trường / bên thứ ba. */
export function isExternalHttpImageRef(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** URL imagedelivery bị sai khi `cover_id` là blob:/data: hoặc URL ngoài bị ghép vào path. */
export function isBrokenCfDeliveryUrl(url: string): boolean {
  if (isTemporaryImageRef(url)) return true;
  if (/\/blob:|\/data:/.test(url)) return true;
  if (/imagedelivery\.net\/[^/]+\/https?:\/\//i.test(url)) return true;
  return false;
}

export function isCfImageUuid(value: string): boolean {
  return CF_UUID_RE.test(value.trim());
}

/** Id ảnh đã lưu DB / hiển thị timeline — loại blob, placeholder compose, block id. */
export function isPersistedImageSeed(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isTemporaryImageRef(trimmed)) return false;
  if (isPlaceholderImageSeed(trimmed)) return false;
  if (/^(b-|extra-|m-)/.test(trimmed)) return false;
  return isCfImageUuid(trimmed) || isExternalHttpImageRef(trimmed);
}

/** UUID Cloudflare đầu tiên trong block album — fallback cover khi blob chưa upload xong. */
export function firstCfUuidFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  if (!blocks?.length) return null;
  for (const block of blocks) {
    if (block.loai !== "imgs") continue;
    const cfg = block.config ?? {};
    const imgs = Array.isArray(cfg.imgs) ? cfg.imgs : [];
    for (const raw of imgs) {
      const seed = String(raw).trim();
      if (CF_UUID_RE.test(seed)) return seed;
    }
    const cells = Array.isArray(cfg.cells) ? cfg.cells : [];
    for (const cell of cells) {
      if (!cell || typeof cell !== "object") continue;
      const c = cell as Record<string, unknown>;
      if (c.kind === "text") continue;
      const seed = String(c.seed ?? "").trim();
      if (CF_UUID_RE.test(seed)) return seed;
    }
  }
  return null;
}

/** Chuẩn hóa `cover_id` trước khi ghi DB — không lưu blob:/data:. */
/** Chuẩn hóa `cover_id` trước khi ghi DB — không lưu blob:/data:. */
function blocksArePhotoAlbumOnly(blocks: ReadonlyArray<Block>): boolean {
  let hasImgs = false;
  let hasEmbed = false;
  for (const block of blocks) {
    if (block.loai === "body" || block.loai === "spacer") continue;
    if (block.loai === "imgs") {
      hasImgs = true;
      continue;
    }
    if (block.loai === "embed") {
      hasEmbed = true;
      continue;
    }
    return false;
  }
  return hasImgs && !hasEmbed;
}

function photoAlbumHasPersistedImages(blocks: ReadonlyArray<Block>): boolean {
  for (const block of blocks) {
    if (block.loai !== "imgs" || block.config?.layout === "mosaic") continue;
    const raw = block.config?.imgs;
    if (!Array.isArray(raw)) continue;
    for (const id of raw) {
      if (typeof id === "string" && isPersistedImageSeed(id)) return true;
    }
  }
  return false;
}

export function sanitizePersistableCoverId(
  raw: unknown,
  blocks?: ReadonlyArray<Block> | null,
): string | null {
  if (blocks?.length && blocksArePhotoAlbumOnly(blocks) && photoAlbumHasPersistedImages(blocks)) {
    return null;
  }

  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return firstCfUuidFromBlocks(blocks);
  if (isTemporaryImageRef(trimmed)) return firstCfUuidFromBlocks(blocks);

  if (CF_UUID_RE.test(trimmed)) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    const cfId = extractCfImageIdFromDeliveryUrl(trimmed);
    if (cfId && CF_UUID_RE.test(cfId) && !isTemporaryImageRef(cfId)) {
      return cfId;
    }
    return trimmed;
  }

  return trimmed.slice(0, 256);
}
