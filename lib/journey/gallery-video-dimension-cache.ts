/** Cache aspect ratio (width/height) theo MP4 URL — probe + video frame thumb ghi chung. */
const aspectBySrc = new Map<string, number>();
const listeners = new Set<() => void>();

function normalizeSrc(src: string): string {
  return src.trim().replace(/#.*$/, "");
}

export function getCachedVideoAspect(src: string): number | undefined {
  const key = normalizeSrc(src);
  if (!key) return undefined;
  return aspectBySrc.get(key);
}

export function setCachedVideoAspect(
  src: string,
  width: number,
  height: number,
): void {
  const key = normalizeSrc(src);
  if (!key || width <= 0 || height <= 0) return;
  const aspect = width / height;
  if (!Number.isFinite(aspect) || aspect <= 0) return;
  if (aspectBySrc.get(key) === aspect) return;
  aspectBySrc.set(key, aspect);
  for (const listener of listeners) listener();
}

export function subscribeVideoAspectCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
