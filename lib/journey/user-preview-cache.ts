/** Client cache + in-flight dedupe cho `/api/users/preview`. */

export type UserPreviewProfile = {
  idNguoiDung: string;
  slug: string;
  tenHienThi: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  giaiDoan: string | null;
  tinhThanh: string | null;
  daXacMinh?: boolean;
  stats: {
    cotMoc: number;
    tacPham: number;
    banBe: number;
  };
};

const TTL_MS = 60_000;
const cache = new Map<string, { profile: UserPreviewProfile; at: number }>();
const inflight = new Map<string, Promise<UserPreviewProfile | null>>();

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function getCachedUserPreview(slug: string): UserPreviewProfile | null {
  const key = normalizeSlug(slug);
  if (!key) return null;
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.profile;
}

export function setCachedUserPreview(
  slug: string,
  profile: UserPreviewProfile,
): void {
  const key = normalizeSlug(slug);
  if (!key) return;
  cache.set(key, { profile, at: Date.now() });
}

export async function fetchUserPreview(
  slug: string,
): Promise<UserPreviewProfile | null> {
  const key = normalizeSlug(slug);
  if (!key) return null;

  const cached = getCachedUserPreview(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const res = await fetch(
        `/api/users/preview?slug=${encodeURIComponent(slug.trim())}`,
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { profile?: UserPreviewProfile | null };
      const profile = json.profile ?? null;
      if (profile) setCachedUserPreview(key, profile);
      return profile;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}

/** Prefetch khi hover/focus — không chặn UI. */
export function prefetchUserPreview(slug: string | null | undefined): void {
  if (!slug?.trim()) return;
  if (getCachedUserPreview(slug)) return;
  void fetchUserPreview(slug);
}
