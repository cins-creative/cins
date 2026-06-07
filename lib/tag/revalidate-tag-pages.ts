import "server-only";

import { revalidatePath } from "next/cache";

import { articlePublicHref } from "@/lib/articles/article-href";

type TagPageRef = {
  slug: string;
  loai_bai_viet: string;
};

/** Revalidate aggregation/article pages for tagged `article_bai_viet` rows. */
export function revalidateTaggedArticlePages(
  tags: ReadonlyArray<TagPageRef>,
): void {
  for (const t of tags) {
    const slug = t.slug?.trim();
    if (!slug) continue;
    revalidatePath(articlePublicHref(t.loai_bai_viet, slug));
  }
}
