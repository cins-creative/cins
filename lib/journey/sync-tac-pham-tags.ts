import "server-only";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ArticleTagRef } from "@/lib/editor/article-tag";
import { fetchArticleTagsForTacPham } from "@/lib/journey/article-tags-batch";
import { MAX_TAC_PHAM_TAGS } from "@/lib/tag/limits";
import { revalidateTaggedArticlePages } from "@/lib/tag/revalidate-tag-pages";

const TAG_SYNC_COT_MOC_CHE_DO = new Set(["public", "feature", "cong_dong"]);

function sanitizeTagIds(tags: ReadonlyArray<ArticleTagRef>): string[] {
  const seen = new Set<string>();
  for (const t of tags) {
    const id = t.id?.trim();
    if (id) seen.add(id);
  }
  return Array.from(seen);
}

async function loadPublicCotMocIdsForTacPham(
  admin: SupabaseClient,
  tacPhamId: string,
): Promise<string[]> {
  const { data: rows } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_cot_moc, content_cot_moc:content_cot_moc!inner(che_do_hien_thi)")
    .eq("id_tac_pham", tacPhamId);

  return (rows ?? [])
    .filter((row) =>
      TAG_SYNC_COT_MOC_CHE_DO.has(
        String(
          (row.content_cot_moc as { che_do_hien_thi?: string } | null)
            ?.che_do_hien_thi ?? "",
        ),
      ),
    )
    .map((row) => row.id_cot_moc as string)
    .filter(Boolean);
}

/** Đồng bộ `article_gan_cot_moc` — trang aggregation đọc cả junction này. */
async function syncCotMocArticleTags(
  admin: SupabaseClient,
  tacPhamId: string,
  addedTagIds: string[],
  removedTagIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (addedTagIds.length === 0 && removedTagIds.length === 0) {
    return { ok: true };
  }

  const mocIds = await loadPublicCotMocIdsForTacPham(admin, tacPhamId);
  if (mocIds.length === 0) return { ok: true };

  if (addedTagIds.length > 0) {
    const rows = addedTagIds.flatMap((id_bai_viet) =>
      mocIds.map((id_cot_moc) => ({ id_bai_viet, id_cot_moc })),
    );
    const { error } = await admin
      .from("article_gan_cot_moc")
      .upsert(rows, { onConflict: "id_bai_viet,id_cot_moc" });
    if (error) {
      return { ok: false, error: "Không gắn tag lên cột mốc." };
    }
  }

  if (removedTagIds.length > 0) {
    const { error } = await admin
      .from("article_gan_cot_moc")
      .delete()
      .in("id_bai_viet", removedTagIds)
      .in("id_cot_moc", mocIds);
    if (error) {
      return { ok: false, error: "Không gỡ tag khỏi cột mốc." };
    }
  }

  return { ok: true };
}

export async function syncTacPhamArticleTags(
  admin: SupabaseClient,
  tacPhamId: string,
  newTags: ReadonlyArray<ArticleTagRef>,
  ownerSlug: string,
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

  const cotMocSync = await syncCotMocArticleTags(
    admin,
    tacPhamId,
    toAdd,
    toRemove,
  );
  if (!cotMocSync.ok) {
    return cotMocSync;
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
