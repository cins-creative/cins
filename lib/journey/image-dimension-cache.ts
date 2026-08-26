/**
 * Cache natural width/height ảnh feed (client).
 * Warm prefetch ghi vào đây → ImageGrid layout justified/portrait
 * không phải chờ pha `is-measuring` (khung trống rồi mới xếp).
 */

type Dims = { width: number; height: number };

const byKey = new Map<string, Dims>();
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function peekImageDimensions(key: string | null | undefined): Dims | null {
  const k = key?.trim();
  if (!k) return null;
  return byKey.get(k) ?? null;
}

export function rememberImageDimensions(
  key: string | null | undefined,
  width: number,
  height: number,
): void {
  const k = key?.trim();
  if (!k || !(width > 0) || !(height > 0)) return;
  const prev = byKey.get(k);
  if (prev && prev.width === width && prev.height === height) return;
  byKey.set(k, { width, height });
  notify();
}

/** Subscribe — ImageGrid / card bump state khi warm đo xong. */
export function subscribeImageDimensions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function enrichGridImageDims<T extends { id: string; width: number; height: number }>(
  image: T,
): T {
  if (image.width > 0 && image.height > 0) return image;
  const hit =
    peekImageDimensions(image.id) ??
    peekImageDimensions(image.id.trim());
  if (!hit) return image;
  return { ...image, width: hit.width, height: hit.height };
}
