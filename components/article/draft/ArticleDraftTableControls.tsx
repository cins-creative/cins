"use client";

import type { Editor } from "@tiptap/react";
import { clsx } from "clsx";
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  PanelTop,
  TableCellsMerge,
  TableCellsSplit,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from "react";

type Props = {
  editor: Editor | null;
  disabled?: boolean;
};

type Anchor = { top: number; left: number; width: number };

const ICO = { size: 15, strokeWidth: 2, "aria-hidden": true as const };

function findEditorWrap(editor: Editor): HTMLElement | null {
  return editor.view.dom.closest(".article-draft-tiptap__editor-wrap");
}

function findActiveTableEl(editor: Editor): HTMLTableElement | null {
  const { view } = editor;
  const { from } = view.state.selection;
  try {
    const dom = view.domAtPos(from);
    let node: Node | null = dom.node;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!(node instanceof Element)) return null;
    return node.closest("table");
  } catch {
    return null;
  }
}

function CtrlBtn({
  title,
  disabled,
  onClick,
  icon: Icon,
  danger,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  icon: LucideIcon;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={clsx(
        "article-draft-tiptap__table-ctrl",
        danger && "article-draft-tiptap__table-ctrl--danger",
      )}
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <Icon {...ICO} />
    </button>
  );
}

function CtrlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="article-draft-tiptap__table-ctrl-group" role="group" aria-label={label}>
      <span className="article-draft-tiptap__table-ctrl-group-label">{label}</span>
      <div className="article-draft-tiptap__table-ctrl-group-btns">{children}</div>
    </div>
  );
}

/**
 * Thanh công cụ gắn dưới bảng đang focus — Lucide icons.
 * Hiện khi caret nằm trong table; ẩn khi ra ngoài.
 */
export function ArticleDraftTableControls({ editor, disabled = false }: Props) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [inTable, setInTable] = useState(false);

  const reposition = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setInTable(false);
      setAnchor(null);
      return;
    }
    const active = editor.isActive("table");
    setInTable(active);
    const wrap = findEditorWrap(editor);
    if (wrap) {
      if (active) wrap.setAttribute("data-table-active", "true");
      else wrap.removeAttribute("data-table-active");
    }
    if (!active) {
      setAnchor(null);
      return;
    }
    const table = findActiveTableEl(editor);
    if (!wrap || !table) {
      setAnchor(null);
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    setAnchor({
      top: tableRect.bottom - wrapRect.top + wrap.scrollTop + 6,
      left: tableRect.left - wrapRect.left + wrap.scrollLeft,
      width: Math.max(tableRect.width, 200),
    });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const bump = () => reposition();
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    editor.on("focus", bump);
    editor.on("blur", bump);
    bump();
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
      editor.off("focus", bump);
      editor.off("blur", bump);
      findEditorWrap(editor)?.removeAttribute("data-table-active");
    };
  }, [editor, reposition]);

  useLayoutEffect(() => {
    if (!inTable || !editor) return;
    const wrap = findEditorWrap(editor);
    if (!wrap) return;
    const onScrollOrResize = () => reposition();
    wrap.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      wrap.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [inTable, editor, reposition]);

  const run = (fn: (ed: Editor) => boolean) => {
    if (!editor || disabled) return;
    fn(editor);
    requestAnimationFrame(reposition);
  };

  if (!editor || !inTable || !anchor) return null;

  return (
    <div
      className="article-draft-tiptap__table-controls"
      role="toolbar"
      aria-label="Sửa bảng"
      style={{
        top: anchor.top,
        left: anchor.left,
        maxWidth: anchor.width,
      }}
    >
      <CtrlGroup label="Cột">
        <CtrlBtn
          title="Thêm cột trái"
          icon={BetweenHorizontalStart}
          disabled={disabled}
          onClick={() => run((ed) => ed.chain().focus().addColumnBefore().run())}
        />
        <CtrlBtn
          title="Thêm cột phải"
          icon={BetweenHorizontalEnd}
          disabled={disabled}
          onClick={() => run((ed) => ed.chain().focus().addColumnAfter().run())}
        />
        <CtrlBtn
          title="Xóa cột"
          icon={TableColumnsSplit}
          disabled={disabled}
          onClick={() => run((ed) => ed.chain().focus().deleteColumn().run())}
        />
      </CtrlGroup>

      <CtrlGroup label="Hàng">
        <CtrlBtn
          title="Thêm hàng trên"
          icon={BetweenVerticalStart}
          disabled={disabled}
          onClick={() => run((ed) => ed.chain().focus().addRowBefore().run())}
        />
        <CtrlBtn
          title="Thêm hàng dưới"
          icon={BetweenVerticalEnd}
          disabled={disabled}
          onClick={() => run((ed) => ed.chain().focus().addRowAfter().run())}
        />
        <CtrlBtn
          title="Xóa hàng"
          icon={TableRowsSplit}
          disabled={disabled}
          onClick={() => run((ed) => ed.chain().focus().deleteRow().run())}
        />
      </CtrlGroup>

      <CtrlGroup label="Ô">
        <CtrlBtn
          title="Gộp ô"
          icon={TableCellsMerge}
          disabled={disabled}
          onClick={() => run((ed) => ed.chain().focus().mergeCells().run())}
        />
        <CtrlBtn
          title="Tách ô"
          icon={TableCellsSplit}
          disabled={disabled}
          onClick={() => run((ed) => ed.chain().focus().splitCell().run())}
        />
        <CtrlBtn
          title="Bật/tắt hàng tiêu đề"
          icon={PanelTop}
          disabled={disabled}
          onClick={() => run((ed) => ed.chain().focus().toggleHeaderRow().run())}
        />
      </CtrlGroup>

      <div className="article-draft-tiptap__table-ctrl-group article-draft-tiptap__table-ctrl-group--solo">
        <CtrlBtn
          title="Xóa bảng"
          icon={Trash2}
          danger
          disabled={disabled}
          onClick={() => run((ed) => ed.chain().focus().deleteTable().run())}
        />
      </div>
    </div>
  );
}
