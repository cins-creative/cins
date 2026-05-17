import { mergeAttributes, Node } from "@tiptap/core";

function readLabel(el: HTMLElement): string {
  const t = el.querySelector(".arc-img-hint-label")?.textContent?.trim();
  return t && t.length > 0 ? t : "Minh họa";
}

function readKeywords(el: HTMLElement): string {
  return el.querySelector(".arc-img-hint-kw")?.textContent?.trim() ?? "";
}

/** Giữ khối placeholder ảnh (`.arc-image-placeholder`) trong editor — StarterKit không parse div tùy ý. */
export const ArcImagePlaceholder = Node.create({
  name: "arcImagePlaceholder",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      label: { default: "Minh họa" },
      keywords: { default: "" },
      wide: { default: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[class*="arc-image-placeholder"]',
        priority: 60,
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const cls = element.getAttribute("class") ?? "";
          return {
            label: readLabel(element),
            keywords: readKeywords(element),
            wide: cls.includes("arc-image-placeholder--wide"),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const classes = ["arc-image-placeholder"];
    if (node.attrs.wide) classes.push("arc-image-placeholder--wide");
    const kw = (node.attrs.keywords as string) || "\u00a0";
    return [
      "div",
      mergeAttributes({ class: classes.join(" ") }),
      ["span", { class: "arc-img-hint-label" }, node.attrs.label],
      ["span", { class: "arc-img-hint-kw" }, kw],
    ];
  },
});
