import "server-only";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ArticleTagRef } from "@/lib/editor/article-tag";
import { fetchArticleTagsForTacPham } from "@/lib/journey/article-tags-batch";
import { revalidateTaggedArticlePages } from "@/lib/tag/revalidate-tag-pages";

function sanitizeTagIds(tags: ReadonlyArray<ArticleTagRef>): string[] {
  const seen = new Set<string>();
  for (const t of tags) {
    const id = t.id?.trim();
    if (id) seen.add(id);
  }
  return Array.from(seen);
}

export async function syncTacPhamArticleTags(
  admin: SupabaseClient,
  tacPhamId: string,
  newTags: ReadonlyArray<ArticleTagRef>,
  ownerSlug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const newTagIds = sanitizeTagIds(newTags);
  const newSet = new Set(newTagIds);

  const { data: existingLinks, error: readErr } = await admin
    .from("article_gan_tac_pham")
    .select("id_bai_viet")
    .eq("id_tac_pham", tacPhamId);

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
      id_tac_pham: tacPhamId,
    }));
    const { error: addErr } = await admin
      .from("article_gan_tac_pham")
      .insert(rows);
    if (addErr) {
      return { ok: false, error: "Không thêm được tag." };
    }
  }

  if (toRemove.length > 0) {
    const { error: rmErr } = await admin
      .from("article_gan_tac_pham")
      .delete()
      .eq("id_tac_pham", tacPhamId)
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

  if (ownerSlug) {
    revalidatePath(`/${ownerSlug}`);
  }

  return { ok: true };
}

export async function loadTacPhamArticleTags(
  admin: SupabaseClient,
  tacPhamId: string,
): Promise<ArticleTagRef[]> {
  const map = await fetchArticleTagsForTacPham(admin, [tacPhamId]);
  return map.get(tacPhamId) ?? [];
}
