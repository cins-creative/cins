import { isComposeSkeletonOrEmpty } from "@/lib/article/compose/skeleton";
import {
  packContribNoiDung,
  unpackContribNoiDung,
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
  const seedHero = {
    tieu_de: input.entitySeed?.tieu_de?.trim() || input.entityTitle?.trim() || "",
    tieu_de_viet: input.entitySeed?.tieu_de_viet?.trim() ?? "",
    tieu_de_eng: input.entitySeed?.tieu_de_eng?.trim() ?? "",
    tom_tat: input.entitySeed?.tom_tat?.trim() ?? "",
    video_url: input.entitySeed?.video_url?.trim() ?? "",
    thumbnail: input.entitySeed?.thumbnail?.trim() ?? "",
    related_tags: input.entitySeed?.related_tags ?? [],
  };

  const existing = input.existingNoiDung?.trim();
  if (existing) {
    const unpacked = unpackContribNoiDung(existing, input.entitySeed);
    if (!isComposeSkeletonOrEmpty(unpacked.bodyHtml, input.loaiBaiViet)) {
      return existing;
    }
    return packContribNoiDung({ hero: unpacked.hero, bodyHtml: "" });
  }

  return packContribNoiDung({ hero: seedHero, bodyHtml: "" });
}
