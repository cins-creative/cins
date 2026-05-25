import { getVideoUrlFromArticleMeta } from "@/lib/articles/lead-video-url";
import type { MetaNganhDaoTao } from "@/lib/articles/types";
import { parseEditorialImages } from "@/lib/nganh/editorialImage";

export function resolveNganhVideoUrl(input: {
  main_video?: string | null;
  meta?: MetaNganhDaoTao | null;
}): string | null {
  const fromMain =
    typeof input.main_video === "string" ? input.main_video.trim() : "";
  if (fromMain) return fromMain;
  return getVideoUrlFromArticleMeta(input.meta ?? null);
}

export function editorialImagesToText(images: string[] | undefined): string {
  return (images ?? []).join("\n");
}

export function textToEditorialImages(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseMetaNganhFields(
  meta: unknown,
): MetaNganhDaoTao | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const ma_nganh = typeof m.ma_nganh === "string" ? m.ma_nganh.trim() : "";
  const editorial_images = parseEditorialImages(m.editorial_images);
  const khoi_thi = Array.isArray(m.khoi_thi)
    ? (m.khoi_thi as string[]).map(String)
    : [];
  const mon_nang_khieu =
    typeof m.mon_nang_khieu === "string" ? m.mon_nang_khieu.trim() : null;
  const thoi_gian_dao_tao =
    typeof m.thoi_gian_dao_tao === "string"
      ? m.thoi_gian_dao_tao.trim()
      : null;
  const video_url =
    typeof m.video_url === "string" ? m.video_url.trim() || null : null;

  const hasData =
    ma_nganh ||
    editorial_images.length > 0 ||
    khoi_thi.length > 0 ||
    mon_nang_khieu ||
    thoi_gian_dao_tao ||
    video_url;

  if (!hasData) return null;

  return {
    ma_nganh,
    khoi_thi,
    mon_nang_khieu,
    thoi_gian_dao_tao,
    editorial_images,
    video_url,
  };
}
