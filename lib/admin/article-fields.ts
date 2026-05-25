import {
  getAdminArticleThumbDisplayUrl,
  hasAdminArticleThumbnail,
} from "@/lib/admin/article-display";
import type {
  AdminArticleDetailRow,
  AdminArticleListRow,
} from "@/lib/admin/articles-server";
import { resolveArticleVideoUrl } from "@/lib/articles/lead-video-url";
import type { ArticleMeta } from "@/lib/articles/types";

export type AdminTableColumnId =
  | "thumb"
  | "title"
  | "loai"
  | "meta"
  | "noi_dung"
  | "meta_json"
  | "status"
  | "views"
  | "date"
  | "actions";

export type AdminFilterFieldId =
  | "loai"
  | "status"
  | "linhVuc"
  | "loaiNhom"
  | "nhom"
  | "media";

export const ADMIN_TABLE_COLUMNS: {
  id: AdminTableColumnId;
  label: string;
  defaultVisible: boolean;
  locked?: boolean;
}[] = [
  { id: "thumb", label: "Ảnh", defaultVisible: true, locked: true },
  { id: "title", label: "Tiêu đề", defaultVisible: true, locked: true },
  { id: "loai", label: "Loại", defaultVisible: true },
  { id: "meta", label: "Lĩnh vực / Nhóm", defaultVisible: false },
  { id: "noi_dung", label: "Nội dung (xem nhanh)", defaultVisible: true },
  { id: "meta_json", label: "Meta JSON (xem nhanh)", defaultVisible: true },
  { id: "status", label: "Trạng thái", defaultVisible: true },
  { id: "views", label: "Lượt xem", defaultVisible: false },
  { id: "date", label: "Ngày tạo", defaultVisible: false },
  { id: "actions", label: "Thao tác", defaultVisible: true, locked: true },
];

export const ADMIN_FILTER_FIELDS: {
  id: AdminFilterFieldId;
  label: string;
  defaultVisible: boolean;
}[] = [
  { id: "loai", label: "Loại bài", defaultVisible: true },
  { id: "status", label: "Trạng thái", defaultVisible: true },
  { id: "linhVuc", label: "Lĩnh vực", defaultVisible: true },
  { id: "loaiNhom", label: "Loại nhóm", defaultVisible: false },
  { id: "nhom", label: "Nhóm cụ thể", defaultVisible: false },
  { id: "media", label: "Lọc ảnh", defaultVisible: false },
];

export const ADMIN_COLUMNS_STORAGE_KEY = "cins-admin-bai-viet-columns-v2";
export const ADMIN_FILTERS_STORAGE_KEY = "cins-admin-bai-viet-filters-v1";

export type ArticleFieldStatus = {
  key: string;
  label: string;
  hasData: boolean;
  hint?: string;
};

function hasText(v: string | null | undefined): boolean {
  return Boolean(v?.trim());
}

function hasMetaObject(meta: unknown): boolean {
  if (meta == null) return false;
  if (typeof meta !== "object") return false;
  return Object.keys(meta as object).length > 0;
}

function mergedBody(r: { noi_dung?: string | null }): string {
  return (r.noi_dung ?? "").trim();
}

/** `main_video` cột DB hoặc `meta.video_url` (ngành / nghề / keyword). */
export function resolveMainVideoValue(row: {
  main_video?: string | null;
  meta?: unknown;
}): string | null {
  return resolveArticleVideoUrl({
    main_video: row.main_video,
    meta: row.meta as ArticleMeta,
  });
}

type InventoryRow = AdminArticleListRow &
  Partial<
    Pick<
      AdminArticleDetailRow,
      "noi_dung" | "meta" | "meta_title" | "meta_description" | "main_video"
    >
  >;

/** Danh sách field cố định thứ tự — luôn có Thumbnail & Main video. */
export function buildArticleFieldInventory(row: InventoryRow): ArticleFieldStatus[] {
  const thumbCol = row.thumbnail?.trim() ?? null;
  const thumbDisplay = getAdminArticleThumbDisplayUrl(row);
  const mainVideo = resolveMainVideoValue(row);
  const body = mergedBody(row);

  return [
    { key: "tieu_de", label: "Tiêu đề chính", hasData: hasText(row.tieu_de) },
    { key: "slug", label: "Slug", hasData: hasText(row.slug) },
    {
      key: "tieu_de_viet",
      label: "Tiêu đề tiếng Việt",
      hasData: hasText(row.tieu_de_viet),
    },
    {
      key: "tieu_de_eng",
      label: "Tiêu đề tiếng Anh",
      hasData: hasText(row.tieu_de_eng),
    },
    { key: "tom_tat", label: "Tóm tắt", hasData: hasText(row.tom_tat) },
    {
      key: "thumbnail",
      label: "Thumbnail",
      hasData: hasAdminArticleThumbnail(row) || Boolean(thumbDisplay),
      hint:
        thumbCol ??
        (thumbDisplay ? "có URL hiển thị" : undefined) ??
        (row.cover_id?.trim() ? `cover: ${row.cover_id.slice(0, 8)}…` : undefined),
    },
    {
      key: "cover_id",
      label: "Cover (cover_id)",
      hasData: hasText(row.cover_id),
      hint: row.cover_id ?? undefined,
    },
    {
      key: "main_video",
      label: "Main video",
      hasData: Boolean(mainVideo),
      hint: mainVideo ?? undefined,
    },
    {
      key: "noi_dung",
      label: "Nội dung (noi_dung)",
      hasData: Boolean(body) || Boolean(row.has_noi_dung),
      hint: body
        ? `${body.length} ký tự`
        : row.noi_dung_preview ?? undefined,
    },
    {
      key: "meta",
      label: "Meta JSON",
      hasData: hasMetaObject(row.meta) || Boolean(row.has_meta),
      hint: row.meta_preview ?? undefined,
    },
    {
      key: "meta_title",
      label: "Meta title (SEO)",
      hasData: hasText(row.meta_title),
      hint: row.meta_title ?? undefined,
    },
    {
      key: "meta_description",
      label: "Meta description (SEO)",
      hasData: hasText(row.meta_description),
    },
    {
      key: "loai_bai_viet",
      label: "Loại bài viết",
      hasData: hasText(row.loai_bai_viet),
    },
    {
      key: "trang_thai",
      label: "Trạng thái",
      hasData: hasText(row.trang_thai_noi_dung),
    },
    {
      key: "id_linh_vuc",
      label: "Lĩnh vực",
      hasData: hasText(row.id_linh_vuc) || hasText(row.linh_vuc_ten),
      hint: row.linh_vuc_ten ?? row.id_linh_vuc ?? undefined,
    },
    {
      key: "nhom",
      label: "Nhóm tag",
      hasData: row.nhom.length > 0,
      hint: row.nhom.length ? `${row.nhom.length} nhóm` : undefined,
    },
    {
      key: "luot_xem",
      label: "Lượt xem",
      hasData: (row.luot_xem ?? 0) > 0,
      hint: String(row.luot_xem ?? 0),
    },
    { key: "tao_luc", label: "Ngày tạo", hasData: hasText(row.tao_luc) },
    {
      key: "cap_nhat_luc",
      label: "Cập nhật lúc",
      hasData: hasText(row.cap_nhat_luc),
    },
  ];
}

/** @deprecated Dùng `buildArticleFieldInventory` */
export function articleFieldStatusFromListRow(
  row: AdminArticleListRow,
): ArticleFieldStatus[] {
  return buildArticleFieldInventory(row);
}

/** @deprecated Dùng `buildArticleFieldInventory` */
export function articleFieldStatusFromDetailRow(
  row: AdminArticleDetailRow,
): ArticleFieldStatus[] {
  return buildArticleFieldInventory(row);
}

export function defaultVisibleColumnIds(): AdminTableColumnId[] {
  return ADMIN_TABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
}

export function defaultVisibleFilterIds(): AdminFilterFieldId[] {
  return ADMIN_FILTER_FIELDS.filter((f) => f.defaultVisible).map((f) => f.id);
}

export function parseStoredIds<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T[],
): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    const set = new Set(allowed);
    const ids = parsed.filter((x): x is T => typeof x === "string" && set.has(x as T));
    const locked = ADMIN_TABLE_COLUMNS.filter((c) => c.locked).map((c) => c.id);
    for (const id of locked) {
      if (!ids.includes(id as T)) ids.push(id as T);
    }
    return ids.length ? ids : fallback;
  } catch {
    return fallback;
  }
}
