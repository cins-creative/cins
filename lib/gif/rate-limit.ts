type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

/** In-memory rate limit (dev / single isolate). Trả true nếu bị chặn. */
export function gifRateLimited(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}
