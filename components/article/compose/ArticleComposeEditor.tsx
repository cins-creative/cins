"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ArticleComposeBlockRow } from "@/components/article/compose/ArticleComposeBlockRow";
import { AddZone } from "@/components/editor/compose/AddZone";
import {
  ARTICLE_COMPOSE_PICKER,
  compileComposeBlocksToHtml,
  createComposeBlock,
  parseComposeHtmlToBlocks,
  type ArticleComposeBlock,
  type ArticleComposeBlockType,
} from "@/lib/article/compose";

import "@/app/[slug]/p/new/editor.css";
import "@/styles/article-compose.css";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export function ArticleComposeEditor({ value, onChange }: Props) {
  const [blocks, setBlocks] = useState<ArticleComposeBlock[]>(() =>
    parseComposeHtmlToBlocks(value),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openAddIdx, setOpenAddIdx] = useState<number | null>(null);
  const skipEmitRef = useRef(false);
  const valueRef = useRef(value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (valueRef.current === value) return;
    valueRef.current = value;
    skipEmitRef.current = true;
    setBlocks(parseComposeHtmlToBlocks(value));
  }, [value]);

  useEffect(() => {
    if (skipEmitRef.current) {
      skipEmitRef.current = false;
      return;
    }
    const html = compileComposeBlocksToHtml(blocks);
    valueRef.current = html;
    onChange(html);
  }, [blocks, onChange]);

  const pickBlockAt = useCallback((type: ArticleComposeBlockType, idx: number) => {
    const block = createComposeBlock(type);
    setBlocks((prev) => {
      const next = prev.slice();
      const at = Math.max(0, Math.min(idx, next.length));
      next.splice(at, 0, block);
      return next;
    });
    setOpenAddIdx(null);
    setSelectedId(block.id);
  }, []);

  const patchBlock = useCallback((id: string, patch: Partial<ArticleComposeBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    );
  }, []);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item!);
      return next;
    });
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const root = rootRef.current;
      const t = e.target;
      if (!(t instanceof Element)) return;

      if (root && !root.contains(t)) {
        setOpenAddIdx(null);
        return;
      }
      if (root && !t.closest(".add-zone")) {
        setOpenAddIdx(null);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className="article-compose-editor cins-editor-page">
      <div className="blocks">
        <AddZone
          idx={0}
          catalog={ARTICLE_COMPOSE_PICKER}
          open={openAddIdx === 0}
          onToggle={(open) => setOpenAddIdx(open ? 0 : null)}
          onPick={(type) => pickBlockAt(type as ArticleComposeBlockType, 0)}
          starter={blocks.length === 0}
          anchorPicker
        />

        {blocks.map((block, i) => (
          <div key={block.id}>
            <ArticleComposeBlockRow
              block={block}
              selected={selectedId === block.id}
              onSelect={() => setSelectedId(block.id)}
              onPatch={(patch) => patchBlock(block.id, patch)}
              onUp={() => moveBlock(block.id, -1)}
              onDown={() => moveBlock(block.id, 1)}
              onDelete={() => deleteBlock(block.id)}
            />
            <AddZone
              idx={i + 1}
              catalog={ARTICLE_COMPOSE_PICKER}
              open={openAddIdx === i + 1}
              onToggle={(open) => setOpenAddIdx(open ? i + 1 : null)}
              onPick={(type) => pickBlockAt(type as ArticleComposeBlockType, i + 1)}
              anchorPicker
            />
          </div>
        ))}
      </div>
    </div>
  );
}
