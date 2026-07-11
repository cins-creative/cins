import { buildComposeSkeleton } from "@/lib/article/compose/skeleton";
import {
  packContribNoiDung,
  type EntityContributionSeed,
} from "@/lib/article/dong-gop/contrib-document";
import { compileArticleHtml } from "@/lib/article/blocks/compile-html";
import { buildDongGopDocument } from "@/lib/article/blocks/registry";

/** HTML khung soạn bản đóng góp — Block Studio skeleton. */
export function buildDongGopSkeleton(
  loaiBaiViet: string,
  entityTitle?: string | null,
): string {
  return compileArticleHtml(
    buildDongGopDocument(loaiBaiViet, entityTitle),
  );
}

export function resolveDongGopEditorInitialHtml(input: {
  loaiBaiViet: string;
  entityTitle?: string | null;
  existingNoiDung?: string | null;
  entitySeed?: EntityContributionSeed;
}): string {
  const existing = input.existingNoiDung?.trim();
  if (existing) return existing;
  const bodyHtml = buildComposeSkeleton(input.loaiBaiViet);
  return packContribNoiDung({
    hero: {
      tieu_de: input.entitySeed?.tieu_de?.trim() || input.entityTitle?.trim() || "",
      tieu_de_viet: input.entitySeed?.tieu_de_viet?.trim() ?? "",
      tieu_de_eng: input.entitySeed?.tieu_de_eng?.trim() ?? "",
      tom_tat: input.entitySeed?.tom_tat?.trim() ?? "",
      video_url: input.entitySeed?.video_url?.trim() ?? "",
      thumbnail: input.entitySeed?.thumbnail?.trim() ?? "",
      related_tags: input.entitySeed?.related_tags ?? [],
    },
    bodyHtml,
  });
}
