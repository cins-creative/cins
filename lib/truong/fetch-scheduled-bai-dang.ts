import "server-only";

import { loadPersonalFiltersForOrgBaiDang } from "@/lib/filter/org-bai-dang-gan";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import { resolveTruongImageSrc } from "@/lib/truong/media-url";
import type { TruongBaiDang } from "@/lib/truong/types";

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Bài `nhap` có `tao_luc` trong tương lai — chỉ admin quản trị tab bài đăng. */
export async function fetchScheduledBaiDang(
  orgId: string,
  limit = 50,
): Promise<TruongBaiDang[]> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("org_bai_dang")
    .select(
      `
      id,
      loai_bai_dang,
      tieu_de,
      tom_tat,
      noi_dung,
      noi_dung_blocks,
      cover_id,
      tao_luc,
      trang_thai,
      org_bai_dang_tag (
        article_bai_viet ( tieu_de_viet, tieu_de, slug )
      )
    `,
    )
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "nhap")
    .gt("tao_luc", now)
    .order("tao_luc", { ascending: false })
    .limit(limit);

  const out: TruongBaiDang[] = [];
  for (const row of data ?? []) {
    const r = row as {
      id?: string;
      loai_bai_dang?: string | null;
      tieu_de?: string;
      tom_tat?: string | null;
      noi_dung?: string | null;
      noi_dung_blocks?: unknown;
      cover_id?: string | null;
      tao_luc?: string | null;
      trang_thai?: string | null;
      org_bai_dang_tag?: {
        article_bai_viet?: {
          tieu_de_viet?: string | null;
          tieu_de?: string | null;
          slug?: string | null;
        } | null;
      }[];
    };
    if (!r.id || !r.tieu_de?.trim()) continue;
    const tags: TruongBaiDang["tags"] = [];
    for (const tag of r.org_bai_dang_tag ?? []) {
      const art = pickOne(tag.article_bai_viet);
      const slug = art?.slug?.trim();
      if (!slug) continue;
      const label =
        art?.tieu_de_viet?.trim() || art?.tieu_de?.trim() || slug;
      if (!tags.some((t) => t.slug === slug)) tags.push({ label, slug });
    }
    const cover_id = r.cover_id?.trim() || null;
    out.push({
      id: r.id,
      loai_bai_dang: r.loai_bai_dang ?? null,
      tieu_de: r.tieu_de.trim(),
      tom_tat: r.tom_tat?.trim() || null,
      noi_dung: r.noi_dung?.trim() || null,
      noiDungBlocks: parseBaiDangBlocks(r.noi_dung_blocks),
      cover_id,
      cover_src: null,
      tao_luc: r.tao_luc ?? null,
      trang_thai: r.trang_thai ?? "nhap",
      tags,
    });
  }

  await Promise.all(
    out.map(async (post) => {
      if (!post.cover_id) return;
      post.cover_src = await resolveTruongImageSrc(post.cover_id, [
        "public",
        "cover",
        "medium",
      ]);
    }),
  );

  const filterMap = await loadPersonalFiltersForOrgBaiDang(out.map((p) => p.id));
  for (const post of out) {
    const filters = filterMap.get(post.id) ?? [];
    post.personalFilters = filters;
    post.personalFilterSlugs = filters.map((f) => f.slug);
  }

  return out;
}
