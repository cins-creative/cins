import type { Visibility } from "@/lib/editor/types";

export type VisibilityNgoaiLeLoai = "chan" | "cho_phep";

export type VisibilityNgoaiLeEntry = {
  mode: VisibilityNgoaiLeLoai;
  userIds: Set<string>;
};

/** Nền DB khi lưu tùy chỉnh — chặn = Bạn bè; cho phép = Chỉ mình tôi. */
export const VISIBILITY_CUSTOM_BASE: Record<
  VisibilityNgoaiLeLoai,
  Visibility
> = {
  chan: "theo_nhom",
  cho_phep: "chi_minh",
};

export function isVisibilityNgoaiLeLoai(
  value: unknown,
): value is VisibilityNgoaiLeLoai {
  return value === "chan" || value === "cho_phep";
}

export const MAX_VISIBILITY_CUSTOM_PEOPLE = 40;

export function sanitizeVisibilityCustomPeopleIds(
  ids: ReadonlyArray<string> | null | undefined,
): string[] {
  if (!ids?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_VISIBILITY_CUSTOM_PEOPLE) break;
  }
  return out;
}

/**
 * Áp ngoại lệ sau luật nền `che_do_hien_thi`.
 * • `cho_phep` — chỉ người trong list (+ owner đã xử lý ngoài) mới thấy.
 * • `chan` — nền vẫn mở nhưng ẩn với người trong list.
 */
export function applyVisibilityNgoaiLe(params: {
  baseVisible: boolean;
  isOwner: boolean;
  viewerId: string | null | undefined;
  ngoaiLe: VisibilityNgoaiLeEntry | null | undefined;
}): boolean {
  if (params.isOwner) return true;
  const entry = params.ngoaiLe;
  if (!entry || entry.userIds.size === 0) return params.baseVisible;

  const viewerId = params.viewerId?.trim() || null;
  if (entry.mode === "cho_phep") {
    return Boolean(viewerId && entry.userIds.has(viewerId));
  }
  if (viewerId && entry.userIds.has(viewerId)) return false;
  return params.baseVisible;
}
