export const ADMIN_ARTICLE_PAGE_SIZE = 30;

export type AdminArticleListParams = {
  page?: number;
  q?: string;
  loai?: string;
  status?: string;
  linhVuc?: string;
  nhom?: string;
  loaiNhom?: string;
  media?: "" | "has_thumb" | "no_thumb" | "has_cover" | "no_cover";
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

  return {
    page,
    q: pickString(sp, "q"),
    loai: pickString(sp, "loai"),
    status: pickString(sp, "status"),
    linhVuc: pickString(sp, "linhVuc"),
    nhom: pickString(sp, "nhom"),
    loaiNhom: pickString(sp, "loaiNhom"),
    media: mediaOk,
  };
}

export function buildAdminBaiVietHref(params: AdminArticleListParams): string {
  const sp = new URLSearchParams();
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.q) sp.set("q", params.q);
  if (params.loai) sp.set("loai", params.loai);
  if (params.status) sp.set("status", params.status);
  if (params.linhVuc) sp.set("linhVuc", params.linhVuc);
  if (params.nhom) sp.set("nhom", params.nhom);
  if (params.loaiNhom) sp.set("loaiNhom", params.loaiNhom);
  if (params.media) sp.set("media", params.media);
  const qs = sp.toString();
  return `/admin/bai-viet${qs ? `?${qs}` : ""}`;
}
