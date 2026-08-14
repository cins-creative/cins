/**
 * Tab public org: id nội bộ (tiếng Việt, khớp `cau_hinh.tabs`) ↔ segment URL
 * tiếng Anh sau PLAN_URL_ENGLISH. Middleware 308 `bai-dang` → `posts` nhưng
 * page `[tab]` vẫn đọc id cũ → 404 khi F5 / hard-nav.
 */

const ORG_PUBLIC_TAB_URL: Record<string, string> = {
  "bai-dang": "posts",
  "tuyen-dung": "jobs",
  "su-kien": "events",
  "hinh-anh": "images",
  "khoa-hoc": "courses",
  "san-pham": "products",
  nganh: "majors",
  "tuyen-sinh": "admissions",
  "do-an-sinh-vien": "student-projects",
};

export function orgTabUrlSegment(internalId: string): string {
  return ORG_PUBLIC_TAB_URL[internalId] ?? internalId;
}

export function orgTabIdFromUrlSegment<T extends string>(
  segment: string,
  allowed: readonly T[],
): T | null {
  if ((allowed as readonly string[]).includes(segment)) return segment as T;
  for (const id of allowed) {
    if (ORG_PUBLIC_TAB_URL[id] === segment) return id;
  }
  return null;
}
