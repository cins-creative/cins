"use client";

import { TagInput, type TagInputValue } from "@/components/tag/TagInput";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import {
  PICKABLE_TAG_LOAI,
  parsePickableTagLoai,
  type PickableTagLoai,
} from "@/lib/tag/tag-loai";

import "./tag-input.css";

type Props = {
  tags: ArticleTagRef[];
  onChange: (tags: ArticleTagRef[]) => void;
  disabled?: boolean;
};

const PICKABLE_SET = new Set<string>(PICKABLE_TAG_LOAI);

function isPickableLoai(loai: string): loai is PickableTagLoai {
  return PICKABLE_SET.has(loai);
}

function toInputValue(tags: ArticleTagRef[]): TagInputValue[] {
  return tags
    .filter((t) => isPickableLoai(t.loai_bai_viet))
    .map((t) => ({
      id: t.id,
      tieu_de: t.tieu_de,
      loai_bai_viet: parsePickableTagLoai(t.loai_bai_viet),
    }));
}

function fromInputValue(
  next: { id: string; tieu_de: string; loai_bai_viet: PickableTagLoai }[],
  existing: ArticleTagRef[],
): ArticleTagRef[] {
  const slugById = new Map(existing.map((t) => [t.id, t.slug]));
  return next.map((t) => ({
    id: t.id,
    tieu_de: t.tieu_de,
    slug: slugById.get(t.id) ?? t.tieu_de.toLowerCase().replace(/\s+/g, "-"),
    loai_bai_viet: t.loai_bai_viet,
  }));
}

function mergeFromInput(
  all: ArticleTagRef[],
  next: { id: string; tieu_de: string; loai_bai_viet: PickableTagLoai }[],
): ArticleTagRef[] {
  const other = all.filter((t) => !isPickableLoai(t.loai_bai_viet));
  return [...other, ...fromInputValue(next, all)];
}

/** Một ô tag: khái niệm, phần mềm, môn học, ngành đào tạo. */
export function PostTagFields({ tags, onChange, disabled }: Props) {
  return (
    <div className="post-tag-fields">
      <TagInput
        value={toInputValue(tags)}
        onChange={(next) => onChange(mergeFromInput(tags, next))}
        disabled={disabled}
      />
    </div>
  );
}
