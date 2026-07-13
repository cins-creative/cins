import "server-only";

import { getCoverUrl } from "@/lib/articles/cover";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";

const NGHE_OG_SELECT =
  "tieu_de, tieu_de_viet, tieu_de_eng, tom_tat, meta_title, meta_description, cover_id, thumbnail, linh_vuc:id_linh_vuc(ten, slug)";

export type NgheOgContext = {
  /** Tiêu đề lớn — ưu tiên tiếng Việt. */
  title: string;
  /** Dòng phụ (thường tiếng Anh) — có thể null. */
  subtitle: string | null;
  /** Mô tả ngắn đã cắt gọn cho card. */
  summary: string | null;
  /** Nhãn lĩnh vực (Game, Phim, Hoạt hình…) — có thể null. */
  linhVuc: string | null;
  /** URL ảnh bìa Cloudflare (variant public) — có thể null. */
  coverUrl: string | null;
};

function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function parseLinhVucTen(raw: unknown): string | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (row && typeof row === "object" && "ten" in row) {
    const ten = String((row as { ten?: unknown }).ten ?? "").trim();
    return ten || null;
  }
  return null;
}

/** Dữ liệu OG card cho bài `nghe` — nhẹ, không tải `noi_dung`. */
export async function fetchNgheOgContext(
  slug: string,
): Promise<NgheOgContext | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select(NGHE_OG_SELECT)
      .eq("slug", slug)
      .eq("loai_bai_viet", "nghe")
      .eq("trang_thai_noi_dung", "published")
      .maybeSingle();
    if (error || !data) return null;

    const r = data as Record<string, unknown>;
    const tieuDeViet = String(r.tieu_de_viet ?? "").trim();
    const tieuDe = String(r.tieu_de ?? "").trim();
    const title = tieuDeViet || tieuDe || "Nghề nghiệp";
    const eng = String(r.tieu_de_eng ?? "").trim();
    // Không lặp lại tiêu đề chính ở dòng phụ.
    const subtitle = eng && eng.toLowerCase() !== title.toLowerCase() ? eng : null;
    const summary = truncate(
      (r.meta_description as string | null) ?? (r.tom_tat as string | null),
      170,
    );
    const coverRef =
      (r.thumbnail as string | null)?.trim() ||
      (r.cover_id as string | null)?.trim() ||
      null;

    return {
      title,
      subtitle,
      summary,
      linhVuc: parseLinhVucTen(r.linh_vuc),
      coverUrl: getCoverUrl(coverRef, "public"),
    };
  } catch {
    return null;
  }
}
