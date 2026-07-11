/** Hero + body gói trong `article_dong_gop.noi_dung` — không cần cột DB mới. */

import {
  PICKABLE_TAG_LOAI,
  parsePickableTagLoai,
  type PickableTagLoai,
} from "@/lib/tag/tag-loai";

export type ContribRelatedTag = {
  id: string;
  tieu_de: string;
  loai_bai_viet: PickableTagLoai;
};

export type ContribHeroMeta = {
  tieu_de: string;
  tieu_de_viet: string;
  tieu_de_eng: string;
  tom_tat: string;
  video_url: string;
  thumbnail: string;
  /** Thẻ liên quan — giống sidebar entity (ngành / kỹ thuật / nghề…). */
  related_tags: ContribRelatedTag[];
};

export type ContribDocument = {
  hero: ContribHeroMeta;
  bodyHtml: string;
};

export type EntityContributionSeed = Partial<
  Omit<ContribHeroMeta, "related_tags">
> & {
  related_tags?: ContribRelatedTag[];
};

const EMPTY_HERO: ContribHeroMeta = {
  tieu_de: "",
  tieu_de_viet: "",
  tieu_de_eng: "",
  tom_tat: "",
  video_url: "",
  thumbnail: "",
  related_tags: [],
};

const PICKABLE_SET = new Set<string>(PICKABLE_TAG_LOAI);

const WRAPPER_OPEN_RE =
  /^<div\s+class="cins-contrib-document"\s+data-cins-hero="([^"]*)">/i;

function normalizeRelatedTags(
  raw: unknown,
): ContribRelatedTag[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ContribRelatedTag[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const tieu_de = typeof row.tieu_de === "string" ? row.tieu_de.trim() : "";
    const loaiRaw =
      typeof row.loai_bai_viet === "string" ? row.loai_bai_viet.trim() : "";
    if (!id || !tieu_de || !PICKABLE_SET.has(loaiRaw) || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      tieu_de,
      loai_bai_viet: parsePickableTagLoai(loaiRaw),
    });
  }
  return out;
}

function normalizeHero(
  raw: Partial<ContribHeroMeta> | null | undefined,
  seed?: EntityContributionSeed,
): ContribHeroMeta {
  const base = { ...EMPTY_HERO, ...seed, ...raw };
  const tom = (base.tom_tat?.trim() ?? "").slice(0, 280);
  return {
    tieu_de: base.tieu_de?.trim() ?? "",
    tieu_de_viet: base.tieu_de_viet?.trim() ?? "",
    tieu_de_eng: base.tieu_de_eng?.trim() ?? "",
    tom_tat: tom,
    video_url: base.video_url?.trim() ?? "",
    thumbnail: base.thumbnail?.trim() ?? "",
    related_tags: normalizeRelatedTags(base.related_tags),
  };
}

export function unpackContribNoiDung(
  noiDung: string,
  seed?: EntityContributionSeed,
): ContribDocument {
  const t = noiDung.trim();
  if (!t) {
    return { hero: normalizeHero(null, seed), bodyHtml: "" };
  }

  const open = t.match(WRAPPER_OPEN_RE);
  if (open?.[1]) {
    const closeIdx = t.toLowerCase().lastIndexOf("</div>");
    if (closeIdx > open[0].length) {
      try {
        const parsed = JSON.parse(
          decodeURIComponent(open[1]),
        ) as Partial<ContribHeroMeta>;
        const inner = t.slice(open[0].length, closeIdx).trim();
        return {
          hero: normalizeHero(parsed, seed),
          bodyHtml: inner,
        };
      } catch {
        /* legacy / corrupt wrapper */
      }
    }
  }

  return { hero: normalizeHero(null, seed), bodyHtml: t };
}

/** Tiêu đề topic — cùng thứ tự với ContributionTopicCard. */
export function contribTopicTitle(
  hero: ContribHeroMeta,
  fallback = "",
): string {
  return (
    hero.tieu_de_viet.trim() ||
    hero.tieu_de_eng.trim() ||
    hero.tieu_de.trim() ||
    hero.tom_tat.trim() ||
    fallback
  );
}

export function packContribNoiDung(doc: ContribDocument): string {
  const hero = normalizeHero(doc.hero);
  const bodyHtml = doc.bodyHtml.trim();
  const heroAttr = encodeURIComponent(JSON.stringify(hero));
  if (!bodyHtml) {
    return `<div class="cins-contrib-document" data-cins-hero="${heroAttr}"></div>`;
  }
  return `<div class="cins-contrib-document" data-cins-hero="${heroAttr}">\n${bodyHtml}\n</div>`;
}

/** Nội dung thân bài (bỏ wrapper hero) — dùng preview / compose editor. */
export function contribBodyHtml(noiDung: string | null | undefined): string {
  return unpackContribNoiDung(noiDung ?? "").bodyHtml;
}

export function mergeContribHero(
  hero: ContribHeroMeta,
  seed?: EntityContributionSeed,
): ContribHeroMeta {
  return normalizeHero(hero, seed);
}

export function relatedTagsByLoai(
  tags: ContribRelatedTag[],
  loai: PickableTagLoai,
): ContribRelatedTag[] {
  return tags.filter((t) => t.loai_bai_viet === loai);
}

export function replaceRelatedTagsLoai(
  tags: ContribRelatedTag[],
  loai: PickableTagLoai,
  nextForLoai: ContribRelatedTag[],
): ContribRelatedTag[] {
  const others = tags.filter((t) => t.loai_bai_viet !== loai);
  const normalized = nextForLoai.map((t) => ({
    id: t.id,
    tieu_de: t.tieu_de,
    loai_bai_viet: loai,
  }));
  return [...others, ...normalized];
}
