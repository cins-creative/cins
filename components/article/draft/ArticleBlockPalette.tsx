"use client";

import type { Editor } from "@tiptap/react";

import { paletteForLoai } from "@/lib/article/blocks/registry";
import type { BlockType } from "@/lib/article/blocks/types";

type Props = {
  editor: Editor | null;
  loaiBaiViet: string;
  disabled?: boolean;
};

const INSERT_CMD: Partial<Record<BlockType, (ed: Editor) => boolean>> = {
  "skill-grid": (ed) => ed.chain().focus().insertArcSkillGrid().run(),
  accordion: (ed) => ed.chain().focus().insertArcAccordion().run(),
  path: (ed) => ed.chain().focus().insertArcPath().run(),
  "job-item": (ed) => ed.chain().focus().insertArcJobItem().run(),
  infobox: (ed) => ed.chain().focus().insertArcInfobox().run(),
  "image-placeholder": (ed) =>
    ed
      .chain()
      .focus()
      .insertContent({
        type: "arcImagePlaceholder",
        attrs: {
          label: "Gợi ý tìm ảnh",
          keywords: "keyword tiếng Anh — nghề + context",
          wide: false,
        },
      })
      .run(),
};

const GROUP_LABEL: Record<string, string> = {
  structure: "Khối layout",
  content: "Nội dung",
  media: "Ảnh",
};

/** Palette chèn block — Block Studio toolbar. */
export function ArticleBlockPalette({ editor, loaiBaiViet, disabled }: Props) {
  const entries = paletteForLoai(loaiBaiViet);
  const groups = [...new Set(entries.map((e) => e.group))];

  return (
    <div
      className="article-block-palette"
      role="toolbar"
      aria-label="Chèn khối nội dung"
    >
      {groups.map((group) => {
        const items = entries.filter((e) => e.group === group);
        return (
          <div key={group} className="article-block-palette__group">
            <span className="article-block-palette__label">
              {GROUP_LABEL[group] ?? group}
            </span>
            <div className="article-block-palette__row">
              {items.map((entry) => {
                const cmd = INSERT_CMD[entry.type];
                return (
                  <button
                    key={entry.type}
                    type="button"
                    className="article-block-palette__btn"
                    title={entry.description}
                    disabled={disabled || !editor || !cmd}
                    onClick={() => {
                      if (!editor || !cmd) return;
                      cmd(editor);
                    }}
                  >
                    <span className="article-block-palette__btn-label">
                      {entry.label}
                    </span>
                  </button>
                );
              })}
              {group === "structure" && loaiBaiViet === "nghe" ? (
                <button
                  type="button"
                  className="article-block-palette__btn article-block-palette__btn--combo"
                  title="Lưới 6 icon + accordion khớp brief nghề"
                  disabled={disabled || !editor}
                  onClick={() => {
                    editor?.chain().focus().insertArcSkillSection().run();
                  }}
                >
                  <span className="article-block-palette__btn-label">
                    Bộ kỹ năng
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
