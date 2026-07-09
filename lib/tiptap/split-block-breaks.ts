import type { Fragment, Node as PMNode } from "@tiptap/pm/model";
import { Fragment as PMFragment } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";

const SPLITTABLE_HTML_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

function isBrElement(node: Node): boolean {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).tagName.toLowerCase() === "br"
  );
}

/** Không tách heading arc có số mục / badge site. */
function shouldSkipHtmlSplit(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "h2" || tag === "h3") {
    if (el.hasAttribute("data-arc-section")) return true;
    if (el.querySelector(":scope > .arc-num, :scope > .arc-heading-body")) {
      return true;
    }
  }
  return false;
}

function splitElementOnBr(el: Element): Element[] {
  const segments: Node[][] = [[]];

  for (const child of Array.from(el.childNodes)) {
    if (isBrElement(child)) {
      segments.push([]);
      continue;
    }
    segments[segments.length - 1]!.push(child.cloneNode(true));
  }

  if (segments.length <= 1) return [el];

  return segments.map((seg) => {
    const clone = el.cloneNode(false) as Element;
    for (const node of seg) clone.appendChild(node);
    return clone;
  });
}

function splitBrInContainer(container: Element): void {
  const children = Array.from(container.childNodes);
  for (const child of children) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (SPLITTABLE_HTML_TAGS.has(tag) && !shouldSkipHtmlSplit(el)) {
      if (el.querySelector(":scope > br")) {
        const parts = splitElementOnBr(el);
        if (parts.length > 1) {
          for (const part of parts) {
            container.insertBefore(part, el);
          }
          container.removeChild(el);
          continue;
        }
      }
    }

    splitBrInContainer(el);
  }
}

/**
 * `<p>a<br>b</p>` → `<p>a</p><p>b</p>` — mỗi xuống dòng thành block riêng.
 * Giữ nguyên heading arc (`data-arc-section`, `.arc-heading-body`).
 */
export function splitBlockBreaksInHtml(html: string): string {
  const trimmed = html?.trim();
  if (!trimmed || !/<br\s*\/?>/i.test(trimmed)) return html;

  if (typeof document === "undefined") return html;

  const root = document.createElement("div");
  root.innerHTML = trimmed;
  splitBrInContainer(root);
  return root.innerHTML;
}

function nodeContainsHardBreak(node: PMNode): boolean {
  let found = false;
  node.descendants((child) => {
    if (child.type.name === "hardBreak") {
      found = true;
      return false;
    }
    return true;
  });
  return found;
}

function splitTextblockOnHardBreak(node: PMNode): PMNode[] {
  const segments: PMNode[] = [];
  let buf: PMNode[] = [];

  const flush = () => {
    segments.push(
      buf.length
        ? node.type.create(node.attrs, PMFragment.from(buf), node.marks)
        : node.type.create(node.attrs, undefined, node.marks),
    );
    buf = [];
  };

  node.forEach((child) => {
    if (child.type.name === "hardBreak") {
      flush();
      return;
    }
    buf.push(child);
  });
  flush();

  return segments.length > 1 ? segments : [node];
}

function rewriteFragment(fragment: Fragment): { fragment: Fragment; changed: boolean } {
  const nodes: PMNode[] = [];
  let changed = false;

  fragment.forEach((node) => {
    if (node.isTextblock && nodeContainsHardBreak(node)) {
      const parts = splitTextblockOnHardBreak(node);
      if (parts.length > 1) {
        changed = true;
        nodes.push(...parts);
        return;
      }
    }

    if (node.content.size > 0) {
      const inner = rewriteFragment(node.content);
      if (inner.changed) {
        changed = true;
        nodes.push(node.copy(inner.fragment));
        return;
      }
    }

    nodes.push(node);
  });

  return { fragment: PMFragment.from(nodes), changed };
}

/** Tách `hardBreak` trong doc ProseMirror thành các textblock riêng. */
export function createSplitHardBreaksTransaction(
  state: EditorState,
): Transaction | null {
  const { doc } = state;
  const { fragment, changed } = rewriteFragment(doc.content);
  if (!changed) return null;
  return state.tr.replaceWith(0, doc.content.size, fragment);
}

export function prepareHtmlForTiptapEditor(html: string): string {
  return splitBlockBreaksInHtml(html);
}
