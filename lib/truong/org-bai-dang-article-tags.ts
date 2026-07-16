import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveArticleThumbnailOnlySync } from "@/lib/bai-viet/thumbnail";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import { MAX_TAC_PHAM_TAGS } from "@/lib/tag/limits";
import { revalidateTaggedArticlePages } from "@/lib/tag/revalidate-tag-pages";
import { recalcDiemNoiDung } from "@/lib/cins/feed-scoring-write";
import type { Block } from "@/lib/editor/types";

type GanRow = {
  id_bai_dang: string;
  article_bai_viet: {
    id?: string | null;
    slug?: string | null;
    tieu_de?: string | null;
    tieu_de_viet?: string | null;
    loai_bai_viet?: string | null;
    tom_tat?: string | null;
    da_verify?: boolean | null;
    thumbnail?: string | null;
    linh_vuc?: { slug?: string | null } | null;
  } | null;
};

function sanitizeTagIds(tags: ReadonlyArray<ArticleTagRef>): string[] {
  const seen = new Set<string>();
  for (const t of tags) {
    const id = t.id?.trim();
    if (id) seen.add(id);
  }
  return Array.from(seen);
}

export async function fetchOrgBaiDangArticleTags(
  admin: SupabaseClient,
  baiDangIds: ReadonlyArray<string>,
): Promise<Map<string, ArticleTagRef[]>> {
  const out = new Map<string, ArticleTagRef[]>();
  if (baiDangIds.length === 0) return out;

  const { data } = await admin
    .from("org_bai_dang_tag")
    .select(
      "id_bai_dang, article_bai_viet ( id, slug, tieu_de, tieu_de_viet, loai_bai_viet, tom_tat, da_verify, thumbnail, linh_vuc:id_linh_vuc ( slug ) )",
    )
    .in("id_bai_dang", baiDangIds as string[])
    .returns<GanRow[]>();

  for (const row of data ?? []) {
    const a = row.article_bai_viet;
    if (!a?.id || !a.slug) continue;
    const tag: ArticleTagRef = {
      id: String(a.id),
      slug: String(a.slug),
      tieu_de:
        String(a.tieu_de_viet ?? a.tieu_de ?? "").trim() || "Không tiêu đề",
      loai_bai_viet: String(a.loai_bai_viet ?? "").trim() || "blog",
      tom_tat: a.tom_tat?.trim() || null,
      da_verify: a.da_verify === true,
      linh_vuc_slug: a.linh_vuc?.slug?.trim() || null,
      thumb_url: resolveArticleThumbnailOnlySync(a.thumbnail),
    };
    const arr = out.get(row.id_bai_dang);
    if (arr) arr.push(tag);
    else out.set(row.id_bai_dang, [tag]);
  }
  return out;
}

export async function loadOrgBaiDangArticleTags(
  admin: SupabaseClient,
  baiDangId: string,
): Promise<ArticleTagRef[]> {
  const map = await fetchOrgBaiDangArticleTags(admin, [baiDangId]);
  return map.get(baiDangId) ?? [];
}

export async function syncOrgBaiDangArticleTags(
  admin: SupabaseClient,
  baiDangId: string,
  newTags: ReadonlyArray<ArticleTagRef>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const newTagIds = sanitizeTagIds(newTags);
  if (newTagIds.length > MAX_TAC_PHAM_TAGS) {
    return {
      ok: false,
      error: `Tối đa ${MAX_TAC_PHAM_TAGS} tag trên một bài viết.`,
    };
  }
  const newSet = new Set(newTagIds);

  const { data: existingLinks, error: readErr } = await admin
    .from("org_bai_dang_tag")
    .select("id_bai_viet")
    .eq("id_bai_dang", baiDangId);

  if (readErr) {
    return { ok: false, error: "Không đọc được tag hiện có." };
  }

  const existingIds = new Set(
    (existingLinks ?? [])
      .map((row: { id_bai_viet?: string | null }) => row.id_bai_viet)
      .filter((v): v is string => typeof v === "string" && v.length > 0),
  );

  const toAdd = newTagIds.filter((id) => !existingIds.has(id));
  const toRemove = Array.from(existingIds).filter((id) => !newSet.has(id));

  if (toAdd.length > 0) {
    const rows = toAdd.map((id_bai_viet) => ({
      id_bai_viet,
      id_bai_dang: baiDangId,
    }));
    const { error: addErr } = await admin.from("org_bai_dang_tag").insert(rows);
    if (addErr) {
      return { ok: false, error: "Không thêm được tag." };
    }
  }

  if (toRemove.length > 0) {
    const { error: rmErr } = await admin
      .from("org_bai_dang_tag")
      .delete()
      .eq("id_bai_dang", baiDangId)
      .in("id_bai_viet", toRemove);
    if (rmErr) {
      return { ok: false, error: "Không xoá được tag." };
    }
  }

  revalidateTaggedArticlePages(newTags);

  if (toRemove.length > 0) {
    const { data: removedRows } = await admin
      .from("article_bai_viet")
      .select("slug, loai_bai_viet")
      .in("id", toRemove);
    revalidateTaggedArticlePages(
      (removedRows ?? []).map((r) => ({
        slug: (r as { slug?: string | null }).slug ?? "",
        loai_bai_viet:
          (r as { loai_bai_viet?: string | null }).loai_bai_viet ?? "blog",
      })),
    );
  }

  const { data: postRow } = await admin
    .from("org_bai_dang")
    .select("tom_tat, cover_id, noi_dung_blocks")
    .eq("id", baiDangId)
    .maybeSingle<{
      tom_tat?: string | null;
      cover_id?: string | null;
      noi_dung_blocks?: unknown;
    }>();

  if (postRow) {
    await recalcDiemNoiDung({
      loai: "org_bai_dang",
      id: baiDangId,
      coverId: typeof postRow.cover_id === "string" ? postRow.cover_id : null,
      moTa: typeof postRow.tom_tat === "string" ? postRow.tom_tat : null,
      blocks: Array.isArray(postRow.noi_dung_blocks)
        ? (postRow.noi_dung_blocks as Block[])
        : null,
      hasTag: newTagIds.length > 0,
    });
  }

  return { ok: true };
}
