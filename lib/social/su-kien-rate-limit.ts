type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

const WINDOW_MS = 60_000;
/** Hạn mềm per-isolate (Workers không share Map). Hàng rào thật = P2 Durable Object. */
const MAX_BATCH = 20;

function clientKey(request: Request, userId: string | null): string {
  const fwd = request.headers.get("x-forwarded-for");
  const ip =
    fwd?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown";
  return `su-kien:${userId ?? ip}`;
}

/** In-memory — trả true nếu vượt hạn (chặn batch). */
export function suKienRateLimited(
  request: Request,
  userId: string | null,
): boolean {
  const key = clientKey(request, userId);
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_BATCH;
}
