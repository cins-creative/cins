"use client";

import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";
import type { MilestonePostDetail } from "@/lib/journey/milestone-post-types";
import { viewerHasActiveComment } from "@/lib/journey/comments-sync-client";
import { countCommentThreads } from "@/lib/social/comments/client-tree";

const cache = new Map<string, MilestonePostDetail>();
const inflight = new Map<string, Promise<MilestonePostDetail>>();
const commentsInflight = new Map<string, Promise<MilestonePostComment[]>>();

const FETCH_TIMEOUT_MS = 40_000;
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
  const timer = window.setTimeout(() => {
    controller.abort(new DOMException("Tải bài viết quá lâu.", "TimeoutError"));
  }, FETCH_TIMEOUT_MS);
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

/** Ghi cache theo mid + slug (nếu có) — modal chỉ biết mid vẫn trúng prefetch. */
function putDetailCache(
  data: MilestonePostDetail,
  options: {
    postOwnerSlug: string;
    postSlug?: string | null;
    milestoneId: string;
  },
): void {
  cache.set(`mid:${data.milestone.id}`, data);
  const ownerSlug = data.owner.slug || options.postOwnerSlug;
  const postSlug = data.posts[0]?.slug || options.postSlug || null;
  if (ownerSlug && postSlug) {
    cache.set(`${ownerSlug}:${postSlug}`, data);
  }
}

async function fetchMilestoneDetailById(
  milestoneId: string,
  lite: boolean,
): Promise<MilestonePostDetail> {
  const q = lite ? "?lite=1" : "";
  const res = await fetchWithTimeout(
    `/api/journey/milestone/${encodeURIComponent(milestoneId)}${q}`,
  );
  return readJsonDetail(res);
}

async function fetchPostDetail(
  ownerSlug: string,
  postSlug: string,
  lite: boolean,
): Promise<MilestonePostDetail> {
  const q = lite ? "?lite=1" : "";
  const res = await fetchWithTimeout(
    `/api/journey/${encodeURIComponent(ownerSlug)}/p/${encodeURIComponent(postSlug)}${q}`,
  );
  return readJsonDetail(res);
}

/** Luôn có `milestoneId` trên card — ưu tiên API theo id; slug chỉ là fallback. */
async function fetchDetail(options: {
  postOwnerSlug: string;
  postSlug?: string | null;
  milestoneId: string;
  lite: boolean;
}): Promise<MilestonePostDetail> {
  try {
    return await fetchMilestoneDetailById(options.milestoneId, options.lite);
  } catch (primaryErr) {
    if (!options.postSlug) throw primaryErr;
    return fetchPostDetail(
      options.postOwnerSlug,
      options.postSlug,
      options.lite,
    );
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

export function readCachedMilestoneDetailById(
  milestoneId: string,
): MilestonePostDetail | null {
  return cache.get(`mid:${milestoneId}`) ?? null;
}

/** Prefetch lite trước khi user click — mở modal gần như tức thì. */
export function prefetchMilestoneDetail(options: {
  postOwnerSlug: string;
  postSlug?: string | null;
  milestoneId: string;
}): void {
  void loadMilestoneDetailCached({ ...options, lite: true }).catch(() => {
    /* Prefetch im lặng — lỗi hiện khi user mở card. */
  });
}

export async function loadMilestoneDetailCached(options: {
  postOwnerSlug: string;
  postSlug?: string | null;
  milestoneId: string;
  /** Mặc định true — bỏ comments/Bunny/html trùng để TTFB nhanh. */
  lite?: boolean;
}): Promise<MilestonePostDetail> {
  const lite = options.lite !== false;
  const midKey = `mid:${options.milestoneId}`;
  const slugKey = options.postSlug
    ? milestoneDetailCacheKey(
        options.postOwnerSlug,
        options.postSlug,
        options.milestoneId,
      )
    : null;

  const hit =
    cache.get(midKey) ?? (slugKey ? cache.get(slugKey) : null) ?? null;
  if (hit) {
    /* Đồng bộ key còn thiếu (prefetch theo slug → modal theo mid). */
    putDetailCache(hit, options);
    return hit;
  }

  const inflightKey = midKey;
  const pending = inflight.get(inflightKey);
  if (pending) {
    const data = await waitWithTimeout(pending, INFLIGHT_WAIT_MS);
    if (data) return data;
    inflight.delete(inflightKey);
  }

  const task = (async () => {
    const data = await fetchDetail({ ...options, lite });
    putDetailCache(data, options);
    return data;
  })();

  inflight.set(inflightKey, task);

  try {
    return await task;
  } catch (err) {
    inflight.delete(inflightKey);
    throw err;
  } finally {
    if (inflight.get(inflightKey) === task) {
      inflight.delete(inflightKey);
    }
  }
}

/** Hydrate bình luận sau lite payload — patch mọi key cache của milestone. */
export async function hydrateMilestoneDetailComments(
  milestoneId: string,
): Promise<MilestonePostComment[]> {
  const pending = commentsInflight.get(milestoneId);
  if (pending) return pending;

  const task = (async () => {
    const res = await fetchWithTimeout(
      `/api/journey/milestone/${encodeURIComponent(milestoneId)}?part=comments`,
    );
    const json = (await res.json().catch(() => null)) as
      | { comments?: MilestonePostComment[]; error?: string }
      | null;
    if (!res.ok) {
      throw new Error(json?.error || "Không tải được bình luận.");
    }
    const comments = Array.isArray(json?.comments) ? json.comments : [];
    patchMilestoneDetailComments(
      milestoneId,
      comments,
      countCommentThreads(comments),
    );
    return comments;
  })();

  commentsInflight.set(milestoneId, task);
  try {
    return await task;
  } finally {
    if (commentsInflight.get(milestoneId) === task) {
      commentsInflight.delete(milestoneId);
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
