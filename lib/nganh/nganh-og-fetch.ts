import "server-only";

import { resolveEditorialImageUrl } from "@/lib/nganh/editorialImage";
import { getNganhMetaBySlugCached } from "@/lib/nganh/nganh-page-queries";

export type NganhOgContext = {
  /** Tiêu đề lớn — ưu tiên tiếng Việt. */
  title: string;
  /** Dòng phụ (thường tiếng Anh) — có thể null. */
  subtitle: string | null;
  /** Mô tả ngắn đã cắt gọn cho card. */
  summary: string | null;
  /** Mã ngành (VD 7210402) — có thể null. */
  maNganh: string | null;
  /** Khối thi (A00, A01, D01…) — tối đa vài khối. */
  khoiThi: string[];
  /** URL ảnh minh hoạ (editorial image đầu) — có thể null. */
  coverUrl: string | null;
};

function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** Dữ liệu OG card cho bài `nganh_dao_tao` — dùng lại meta đã cache. */
export async function fetchNganhOgContext(
  slug: string,
): Promise<NganhOgContext | null> {
  const meta = await getNganhMetaBySlugCached(slug);
  if (!meta) return null;

  const title = meta.tieu_de_viet?.trim() || meta.tieu_de?.trim() || "Ngành đào tạo";
  const eng = meta.tieu_de_eng?.trim() ?? "";
  const subtitle = eng && eng.toLowerCase() !== title.toLowerCase() ? eng : null;

  const maNganh = meta.meta?.ma_nganh?.trim() || null;
  const khoiThi = (meta.meta?.khoi_thi ?? [])
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 4);

  const firstImage = meta.meta?.editorial_images?.find((s) => s.trim());
  const coverUrl = firstImage ? resolveEditorialImageUrl(firstImage) : null;

  return {
    title,
    subtitle,
    summary: truncate(meta.tom_tat, 170),
    maNganh,
    khoiThi,
    coverUrl,
  };
}
