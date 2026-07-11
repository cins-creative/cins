import { Extension, Node } from "@tiptap/core";

import {
  DEFAULT_PATH_STEPS,
  DEFAULT_SKILL_ITEMS,
  defaultAccordionFromSkills,
} from "@/lib/article/blocks/defaults";
import type {
  AccordionItem,
  PathStep,
  SkillItem,
} from "@/lib/article/blocks/types";

function parseSkillItems(el: HTMLElement): SkillItem[] {
  const items: SkillItem[] = [];
  el.querySelectorAll(":scope > .arc-skill-icon-item").forEach((itemEl) => {
    const icon =
      itemEl
        .querySelector(".arc-skill-ms, .arc-skill-emoji")
        ?.textContent?.trim() || "widgets";
    const label =
      itemEl.querySelector(".arc-skill-label")?.textContent?.trim() ||
      "Kỹ năng";
    items.push({ icon, label });
  });
  return items.length > 0 ? items : [...DEFAULT_SKILL_ITEMS];
}

function parseAccordionItems(el: HTMLElement): AccordionItem[] {
  const items: AccordionItem[] = [];
  el.querySelectorAll(":scope > details.arc-card").forEach((card) => {
    items.push({
      summary: card.querySelector("summary")?.textContent?.trim() || "Kỹ năng",
      body:
        card.querySelector(".arc-card-body")?.textContent?.trim() ||
        "Mô tả kỹ năng.",
      open: card.hasAttribute("open"),
    });
  });
  return items.length > 0 ? items : defaultAccordionFromSkills();
}

function parsePathSteps(el: HTMLElement): PathStep[] {
  const steps: PathStep[] = [];
  el.querySelectorAll(":scope > .arc-path-step").forEach((stepEl) => {
    steps.push({
      title:
        stepEl.querySelector(".arc-step-body strong")?.textContent?.trim() ||
        "Bước",
      body:
        stepEl.querySelector(".arc-step-body p")?.textContent?.trim() ||
        "Mô tả bước này.",
    });
  });
  return steps.length > 0 ? steps : [...DEFAULT_PATH_STEPS];
}

function readJsonAttr<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const blockAtomBase = {
  group: "block" as const,
  atom: true,
  draggable: true,
  selectable: true,
};

export const ArcSkillGridBlock = Node.create({
  name: "arcSkillGrid",
  ...blockAtomBase,

  addAttributes() {
    return {
      itemsJson: {
        default: JSON.stringify(DEFAULT_SKILL_ITEMS),
        parseHTML: (el) => {
          if (!(el instanceof HTMLElement)) return JSON.stringify(DEFAULT_SKILL_ITEMS);
          return JSON.stringify(parseSkillItems(el));
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[class*="arc-skill-grid"]', priority: 65 }];
  },

  renderHTML({ node }) {
    const items = readJsonAttr<SkillItem[]>(
      node.attrs.itemsJson,
      DEFAULT_SKILL_ITEMS,
    );
    return [
      "div",
      { class: "arc-skill-grid" },
      ...items.map((item) => [
        "div",
        { class: "arc-skill-icon-item" },
        [
          "span",
          {
            class:
              "arc-skill-emoji arc-skill-ms material-symbols-outlined",
            "aria-hidden": "true",
          },
          item.icon,
        ],
        ["span", { class: "arc-skill-label" }, item.label],
      ]),
    ];
  },
});

export const ArcAccordionBlock = Node.create({
  name: "arcAccordion",
  ...blockAtomBase,

  addAttributes() {
    return {
      itemsJson: {
        default: JSON.stringify(defaultAccordionFromSkills()),
        parseHTML: (el) => {
          if (!(el instanceof HTMLElement)) {
            return JSON.stringify(defaultAccordionFromSkills());
          }
          return JSON.stringify(parseAccordionItems(el));
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[class*="arc-accordion"]', priority: 65 }];
  },

  renderHTML({ node }) {
    const items = readJsonAttr<AccordionItem[]>(
      node.attrs.itemsJson,
      defaultAccordionFromSkills(),
    );
    return [
      "div",
      { class: "arc-accordion" },
      ...items.map((item) => [
        "details",
        { class: "arc-card", ...(item.open ? { open: "open" } : {}) },
        ["summary", {}, item.summary],
        ["div", { class: "arc-card-body" }, ["p", {}, item.body]],
      ]),
    ];
  },
});

export const ArcPathBlock = Node.create({
  name: "arcPath",
  ...blockAtomBase,

  addAttributes() {
    return {
      stepsJson: {
        default: JSON.stringify(DEFAULT_PATH_STEPS),
        parseHTML: (el) => {
          if (!(el instanceof HTMLElement)) {
            return JSON.stringify(DEFAULT_PATH_STEPS);
          }
          return JSON.stringify(parsePathSteps(el));
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[class*="arc-path"]', priority: 65 }];
  },

  renderHTML({ node }) {
    const steps = readJsonAttr<PathStep[]>(
      node.attrs.stepsJson,
      DEFAULT_PATH_STEPS,
    );
    return [
      "div",
      { class: "arc-path" },
      ...steps.map((step, i) => [
        "div",
        { class: "arc-path-step" },
        ["div", { class: "arc-step-num" }, String(i + 1)],
        [
          "div",
          { class: "arc-step-body" },
          ["strong", {}, step.title],
          ["p", {}, step.body],
        ],
      ]),
    ];
  },
});

export const ArcJobItemBlock = Node.create({
  name: "arcJobItem",
  ...blockAtomBase,

  addAttributes() {
    return {
      title: { default: "1. Tên đầu việc" },
      body: {
        default:
          "Mô tả — làm gì, tại sao quan trọng, kết quả trông như thế nào.",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[class*="arc-job-item"]',
        priority: 65,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            title:
              el.querySelector(".arc-h3, h3")?.textContent?.trim() ||
              "1. Đầu việc",
            body:
              el.querySelector("p")?.textContent?.trim() ||
              "Mô tả đầu việc.",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      { class: "arc-job-item" },
      ["h3", { class: "arc-h3" }, node.attrs.title as string],
      ["p", {}, node.attrs.body as string],
    ];
  },
});

export const ArcInfoboxBlock = Node.create({
  name: "arcInfobox",
  ...blockAtomBase,

  addAttributes() {
    return {
      label: { default: "Lưu ý" },
      body: { default: "Thông tin quan trọng cần nhấn mạnh." },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[class*="arc-infobox"]',
        priority: 65,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            label:
              el.querySelector(".arc-infobox-label")?.textContent?.trim() ||
              "Lưu ý",
            body:
              el.querySelector("p")?.textContent?.trim() || "Nội dung infobox.",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      { class: "arc-infobox" },
      ["span", { class: "arc-infobox-label" }, node.attrs.label as string],
      ["p", {}, node.attrs.body as string],
    ];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    arcBlocks: {
      insertArcSkillGrid: () => ReturnType;
      insertArcAccordion: () => ReturnType;
      insertArcPath: () => ReturnType;
      insertArcJobItem: () => ReturnType;
      insertArcInfobox: () => ReturnType;
      insertArcSkillSection: () => ReturnType;
    };
  }
}

export const ArcBlockCommands = Extension.create({
  name: "arcBlockCommands",

  addCommands() {
    return {
      insertArcSkillGrid:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: "arcSkillGrid",
            attrs: { itemsJson: JSON.stringify(DEFAULT_SKILL_ITEMS) },
          }),

      insertArcAccordion:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: "arcAccordion",
            attrs: {
              itemsJson: JSON.stringify(defaultAccordionFromSkills()),
            },
          }),

      insertArcPath:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: "arcPath",
            attrs: { stepsJson: JSON.stringify(DEFAULT_PATH_STEPS) },
          }),

      insertArcJobItem:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: "arcJobItem" }),

      insertArcInfobox:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: "arcInfobox" }),

      insertArcSkillSection:
        () =>
        ({ commands }) =>
          commands.insertContent([
            {
              type: "arcSkillGrid",
              attrs: { itemsJson: JSON.stringify(DEFAULT_SKILL_ITEMS) },
            },
            {
              type: "arcAccordion",
              attrs: {
                itemsJson: JSON.stringify(defaultAccordionFromSkills()),
              },
            },
          ]),
    };
  },
});

export const ARTICLE_ARC_BLOCK_EXTENSIONS = [
  ArcSkillGridBlock,
  ArcAccordionBlock,
  ArcPathBlock,
  ArcJobItemBlock,
  ArcInfoboxBlock,
  ArcBlockCommands,
];
