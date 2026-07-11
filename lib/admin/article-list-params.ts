export const ADMIN_ARTICLE_PAGE_SIZE = 30;

export type AdminBaiVietTab = "list" | "dong-gop";

export type AdminArticleListParams = {
  page?: number;
  q?: string;
  loai?: string;
  status?: string;
  linhVuc?: string;
  nhom?: string;
  loaiNhom?: string;
  media?: "" | "has_thumb" | "no_thumb" | "has_cover" | "no_cover";
  /** Chỉ bài có đóng góp `cho_duyet`. */
  dongGop?: "cho_duyet";
  /** Tab đóng góp — lọc theo 1 bài viết. */
  bai?: string;
};

export type AdminArticleListSearchParams = Record<
  string,
  string | string[] | undefined
>;

function pickString(
  sp: AdminArticleListSearchParams,
  key: string,
): string | undefined {
  const raw = sp[key];
  const v = Array.isArray(raw) ? raw[0] : raw;
  const s = v?.trim();
  return s || undefined;
}

export function parseAdminBaiVietTab(
  sp: AdminArticleListSearchParams,
): AdminBaiVietTab {
  return pickString(sp, "tab") === "dong-gop" ? "dong-gop" : "list";
}

export function parseAdminArticleListParams(
  sp: AdminArticleListSearchParams,
): AdminArticleListParams {
  const pageRaw = pickString(sp, "page");
  const page = pageRaw ? Math.max(1, parseInt(pageRaw, 10) || 1) : 1;

  const media = pickString(sp, "media") as AdminArticleListParams["media"];
  const mediaOk =
    media === "has_thumb" ||
    media === "no_thumb" ||
    media === "has_cover" ||
    media === "no_cover"
      ? media
      : undefined;

  const dongGop = pickString(sp, "dongGop");

  return {
    page,
    q: pickString(sp, "q"),
    loai: pickString(sp, "loai"),
    status: pickString(sp, "status"),
    linhVuc: pickString(sp, "linhVuc"),
    nhom: pickString(sp, "nhom"),
    loaiNhom: pickString(sp, "loaiNhom"),
    media: mediaOk,
    dongGop: dongGop === "cho_duyet" ? "cho_duyet" : undefined,
    bai: pickString(sp, "bai"),
  };
}

export function buildAdminBaiVietHref(
  params: AdminArticleListParams,
  options?: { tab?: AdminBaiVietTab },
): string {
  const sp = new URLSearchParams();
  if (options?.tab === "dong-gop") sp.set("tab", "dong-gop");
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.q) sp.set("q", params.q);
  if (params.loai) sp.set("loai", params.loai);
  if (params.status) sp.set("status", params.status);
  if (params.linhVuc) sp.set("linhVuc", params.linhVuc);
  if (params.nhom) sp.set("nhom", params.nhom);
  if (params.loaiNhom) sp.set("loaiNhom", params.loaiNhom);
  if (params.media) sp.set("media", params.media);
  if (params.dongGop) sp.set("dongGop", params.dongGop);
  if (params.bai && options?.tab === "dong-gop") sp.set("bai", params.bai);
  const qs = sp.toString();
  return `/admin/bai-viet${qs ? `?${qs}` : ""}`;
}
