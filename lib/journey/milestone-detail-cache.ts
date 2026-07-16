"use client";

import type { MilestonePostDetail } from "@/lib/journey/milestone-post-types";
import { viewerHasActiveComment } from "@/lib/journey/comments-sync-client";

const cache = new Map<string, MilestonePostDetail>();
const inflight = new Map<string, Promise<MilestonePostDetail>>();

const FETCH_TIMEOUT_MS = 20_000;
const INFLIGHT_WAIT_MS = FETCH_TIMEOUT_MS + 500;

export function milestoneDetailCacheKey(
  postOwnerSlug: string,
  postSlug?: string | null,
  milestoneId?: string,
): string {
  if (postSlug) return `${postOwnerSlug}:${postSlug}`;
  return `mid:${milestoneId ?? ""}`;
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function readJsonDetail(res: Response): Promise<MilestonePostDetail> {
  const json = (await res.json().catch(() => null)) as
    | MilestonePostDetail
    | { error?: string }
    | null;
  if (!res.ok) {
    throw new Error(
      json && typeof json === "object" && "error" in json && json.error
        ? json.error
        : "Không tải được bài viết.",
    );
  }
  if (!json || typeof json !== "object" || !("posts" in json)) {
    throw new Error("Phản hồi bài viết không hợp lệ.");
  }
  return json as MilestonePostDetail;
}

async function fetchPostDetail(
  ownerSlug: string,
  postSlug: string,
): Promise<MilestonePostDetail> {
  const res = await fetchWithTimeout(
    `/api/journey/${encodeURIComponent(ownerSlug)}/p/${encodeURIComponent(postSlug)}`,
  );
  return readJsonDetail(res);
}

async function fetchMilestoneDetailById(
  milestoneId: string,
): Promise<MilestonePostDetail> {
  const res = await fetchWithTimeout(
    `/api/journey/milestone/${encodeURIComponent(milestoneId)}`,
  );
  return readJsonDetail(res);
}

/** Luôn có `milestoneId` trên card — ưu tiên API theo id; slug chỉ là fallback. */
async function fetchDetail(options: {
  postOwnerSlug: string;
  postSlug?: string | null;
  milestoneId: string;
}): Promise<MilestonePostDetail> {
  try {
    return await fetchMilestoneDetailById(options.milestoneId);
  } catch (primaryErr) {
    if (!options.postSlug) throw primaryErr;
    return fetchPostDetail(options.postOwnerSlug, options.postSlug);
  }
}

function waitWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  return Promise.race([
    promise.then((value) => value as T | null),
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), ms);
    }),
  ]);
}

export function readCachedMilestoneDetail(
  key: string,
): MilestonePostDetail | null {
  return cache.get(key) ?? null;
}

/** Prefetch trước khi user click — expand gần như tức thì nếu đã cache. */
export function prefetchMilestoneDetail(options: {
  postOwnerSlug: string;
  postSlug?: string | null;
  milestoneId: string;
}): void {
  void loadMilestoneDetailCached(options).catch(() => {
    /* Prefetch im lặng — lỗi hiện khi user mở card. */
  });
}

export async function loadMilestoneDetailCached(options: {
  postOwnerSlug: string;
  postSlug?: string | null;
  milestoneId: string;
}): Promise<MilestonePostDetail> {
  const key = milestoneDetailCacheKey(
    options.postOwnerSlug,
    options.postSlug,
    options.milestoneId,
  );
  const hit = cache.get(key);
  if (hit) return hit;

  const pending = inflight.get(key);
  if (pending) {
    const data = await waitWithTimeout(pending, INFLIGHT_WAIT_MS);
    if (data) return data;
    inflight.delete(key);
  }

  const task = (async () => {
    const data = await fetchDetail(options);
    cache.set(key, data);
    return data;
  })();

  inflight.set(key, task);

  try {
    return await task;
  } catch (err) {
    inflight.delete(key);
    throw err;
  } finally {
    if (inflight.get(key) === task) {
      inflight.delete(key);
    }
  }
}

export function invalidateMilestoneDetailCache(key: string): void {
  cache.delete(key);
  inflight.delete(key);
}

/** Giữ cache unfold đồng bộ sau thêm/xoá BL — tránh mở lại vẫn thiếu tin. */
export function patchMilestoneDetailComments(
  milestoneId: string,
  comments: MilestonePostDetail["comments"],
  commentCount: number,
): void {
  for (const [key, value] of cache.entries()) {
    if (value.milestone.id !== milestoneId) continue;
    cache.set(key, {
      ...value,
      comments: [...comments],
      social: {
        ...value.social,
        commentCount,
        viewerCommented: viewerHasActiveComment(comments),
      },
    });
  }
}
