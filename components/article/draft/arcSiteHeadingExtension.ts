import { mergeAttributes } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import type { Schema } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";

type Level23 = 2 | 3;

/** Lấy số mục (01, 02…) và phần tiêu đề còn lại từ HTML hoặc text dính kiểu "013D…". */
function extractSectionNumAndBody(el: HTMLElement, level: Level23): {
  sectionNum: string | null;
  body: string;
} {
  const dataSec = el.getAttribute("data-arc-section")?.trim();
  if (dataSec && /^\d{2}$/.test(dataSec)) {
    const bodyEl = el.querySelector(":scope > .arc-heading-body");
    const body = (bodyEl?.textContent ?? el.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim();
    return { sectionNum: dataSec, body };
  }
  const numEl = el.querySelector(":scope > .arc-num");
  if (numEl?.textContent?.trim()) {
    const sectionNum = numEl.textContent.trim();
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".arc-num").forEach((n) => n.remove());
    const body = (clone.textContent ?? "").replace(/\s+/g, " ").trim();
    return { sectionNum, body };
  }
  const raw = (el.textContent ?? "").replace(/\u00a0/g, " ").trim();
  const spaced = raw.match(/^(\d{2})\s+([\s\S]*)$/);
  if (spaced?.[1] && spaced[2] != null) {
    return { sectionNum: spaced[1], body: spaced[2].trim() };
  }
  const glued = raw.match(/^(\d{2})(\S.*)$/);
  if (glued?.[1] && glued[2] != null) {
    return { sectionNum: glued[1], body: glued[2].trim() };
  }
  return { sectionNum: null, body: raw };
}

function headingBodyFragment(schema: Schema, body: string): Fragment {
  if (!body) return Fragment.empty;
  return Fragment.from(schema.text(body));
}

function headingWithBadgeParseRules(level: Level23) {
  const tag = `h${level}` as const;
  return [
    {
      tag,
      priority: 70,
      getAttrs: (element: Node) => {
        const el = element as HTMLElement;
        const { sectionNum } = extractSectionNumAndBody(el, level);
        if (sectionNum === null) return false;
        return { level, sectionNum };
      },
      getContent: (node: Node, schema: Schema) => {
        const el = node as HTMLElement;
        const { body } = extractSectionNumAndBody(el, level);
        return headingBodyFragment(schema, body);
      },
    },
    {
      tag,
      priority: 59,
      attrs: { level, sectionNum: null },
    },
  ];
}

/**
 * H2/H3 dùng class `arc-h2` / `arc-h3`. Có số mục: `data-arc-section` + `span.arc-heading-body`
 * (một wrapper chứa nội dung — ProseMirror bắt buộc lỗ `0` là con duy nhất của `h*`).
 * HTML từ CMS cũ vẫn có thể dùng `span.arc-num` — parse vẫn nhận.
 */
export const ArcSiteHeading = Heading.extend({
  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false,
      },
      sectionNum: {
        default: null,
        rendered: false,
      },
    };
  },

  parseHTML() {
    const levels = this.options.levels as number[];
    const rules = [];
    for (const level of levels) {
      if (level === 2 || level === 3) {
        rules.push(...headingWithBadgeParseRules(level as Level23));
      } else {
        rules.push({ tag: `h${level}`, attrs: { level } });
      }
    }
    return rules;
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level as number;
    const sectionNum = node.attrs.sectionNum as string | null;
    const tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    const arc = level === 2 ? "arc-h2" : level === 3 ? "arc-h3" : null;
    const merged = mergeAttributes(HTMLAttributes, arc ? { class: arc } : {});

    if ((level === 2 || level === 3) && sectionNum) {
      return [
        tag,
        mergeAttributes(merged, { "data-arc-section": sectionNum }),
        ["span", { class: "arc-heading-body" }, 0],
      ];
    }
    return [tag, merged, 0];
  },
}).configure({ levels: [1, 2, 3] });
