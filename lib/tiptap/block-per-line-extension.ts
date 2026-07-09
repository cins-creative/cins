import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

import {
  createSplitHardBreaksTransaction,
  splitBlockBreaksInHtml,
} from "@/lib/tiptap/split-block-breaks";

/**
 * Mỗi xuống dòng = một block (paragraph/heading riêng).
 * - Tách `<br>` / hardBreak khi load, dán, hoặc mở editor.
 * - Shift+Enter tạo block mới (không chèn hardBreak).
 */
export const BlockPerLine = Extension.create({
  name: "blockPerLine",
  priority: 1001,

  onCreate() {
    const tr = createSplitHardBreaksTransaction(this.editor.state);
    if (!tr) return;
    tr.setMeta("addToHistory", false);
    this.editor.view.dispatch(tr);
  },

  addKeyboardShortcuts() {
    return {
      "Shift-Enter": ({ editor }) => editor.commands.splitBlock(),
      "Mod-Enter": ({ editor }) => editor.commands.splitBlock(),
    };
  },

  addProseMirrorPlugins() {
    const splitAfterPaste = new Plugin({
      appendTransaction: (transactions, _oldState, newState) => {
        const pasted = transactions.some(
          (tr) => tr.docChanged && tr.getMeta("paste"),
        );
        if (!pasted) return null;
        return createSplitHardBreaksTransaction(newState);
      },
    });

    return [
      splitAfterPaste,
      new Plugin({
        props: {
          transformPastedHTML: (html) => splitBlockBreaksInHtml(html),
          transformPastedText: (text) => {
            if (!/\r?\n/.test(text)) return text;
            return text
              .split(/\r?\n/)
              .map((line) => line.trimEnd())
              .join("\n\n");
          },
        },
      }),
    ];
  },
});
