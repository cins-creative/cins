import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

export type TruongHeadingLevel = 1 | 2 | 3 | 4 | 5;

type BlockRef = { pos: number; node: PMNode };

function findTextblockDepth($from: Editor["state"]["selection"]["$from"]): number | null {
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).isTextblock) return d;
  }
  return null;
}

/** Đoạn / heading tại con trỏ. */
export function getCurrentTextblock(editor: Editor) {
  const { $from } = editor.state.selection;
  const depth = findTextblockDepth($from);
  if (depth == null) return null;
  return { node: $from.node(depth), depth, pos: $from.before(depth) };
}

/** Các khối văn bản giao với vùng chọn hiện tại (không đụng khối ngoài vùng chọn). */
function collectTextblocksInSelection(editor: Editor): BlockRef[] {
  const { state } = editor;
  const { from, to, empty } = state.selection;
  const blocks: BlockRef[] = [];

  if (empty) {
    const cur = getCurrentTextblock(editor);
    if (cur) blocks.push({ pos: cur.pos, node: cur.node });
    return blocks;
  }

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true;
    const contentFrom = pos + 1;
    const contentTo = pos + node.nodeSize - 1;
    if (to <= contentFrom || from >= contentTo) return false;
    blocks.push({ pos, node });
    return false;
  });

  return blocks;
}

function headingAttrsForNode(node: PMNode, level: TruongHeadingLevel) {
  const sectionNum =
    node.type.name === "heading" && typeof node.attrs.sectionNum === "string"
      ? node.attrs.sectionNum
      : null;
  if (level === 2 || level === 3) {
    return { level, sectionNum };
  }
  return { level, sectionNum: null };
}

function dispatchBlockTransforms(
  editor: Editor,
  map: (node: PMNode, pos: number) => { type: PMNode["type"]; attrs: Record<string, unknown> } | null,
): boolean {
  const blocks = collectTextblocksInSelection(editor);
  if (blocks.length === 0) return false;

  const { state } = editor;
  let tr = state.tr;
  const selFrom = state.selection.from;
  const selTo = state.selection.to;

  for (let i = blocks.length - 1; i >= 0; i--) {
    const { pos, node } = blocks[i];
    const next = map(node, pos);
    if (!next) continue;
    tr = tr.setNodeMarkup(pos, next.type, next.attrs, node.marks);
  }

  const max = tr.doc.content.size;
  const newFrom = Math.min(tr.mapping.map(selFrom), max);
  const newTo = Math.min(tr.mapping.map(selTo), max);
  tr = tr.setSelection(TextSelection.create(tr.doc, newFrom, newTo));

  editor.view.dispatch(tr);
  return true;
}

export function isCurrentBlockHeading(editor: Editor, level: number): boolean {
  const blocks = collectTextblocksInSelection(editor);
  if (blocks.length !== 1) return false;
  const node = blocks[0].node;
  return node.type.name === "heading" && node.attrs.level === level;
}

export function isCurrentBlockParagraph(editor: Editor): boolean {
  const blocks = collectTextblocksInSelection(editor);
  if (blocks.length !== 1) return false;
  return blocks[0].node.type.name === "paragraph";
}

/** Chỉ đổi các khối nằm trong vùng chọn; khối khác giữ nguyên. */
export function setCurrentBlockHeading(editor: Editor, level: TruongHeadingLevel): boolean {
  const blocks = collectTextblocksInSelection(editor);
  if (blocks.length === 0) return false;

  const { state } = editor;
  const heading = state.schema.nodes.heading;
  const paragraph = state.schema.nodes.paragraph;
  if (!heading || !paragraph) return false;

  const allSameHeading = blocks.every(
    (b) => b.node.type.name === "heading" && b.node.attrs.level === level,
  );

  return dispatchBlockTransforms(editor, (node) => {
    if (allSameHeading) {
      return { type: paragraph, attrs: {} };
    }
    return { type: heading, attrs: headingAttrsForNode(node, level) };
  });
}

export function setCurrentBlockParagraph(editor: Editor): boolean {
  const { state } = editor;
  const paragraph = state.schema.nodes.paragraph;
  if (!paragraph) return false;

  return dispatchBlockTransforms(editor, (node) => {
    if (node.type.name === "paragraph") return null;
    return { type: paragraph, attrs: {} };
  });
}
