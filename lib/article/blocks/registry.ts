import {
  ARTICLE_DOC_VERSION,
  type ArticleDocument,
  type BlockNode,
  type BlockPaletteEntry,
} from "@/lib/article/blocks/types";
import {
  DEFAULT_PATH_STEPS,
  DEFAULT_SKILL_ITEMS,
  defaultAccordionFromSkills,
} from "@/lib/article/blocks/defaults";

/** Registry palette — metadata cho toolbar (web + spec mobile). */
export const BLOCK_PALETTE: BlockPaletteEntry[] = [
  {
    type: "skill-grid",
    label: "Lưới kỹ năng",
    description: "6 icon + nhãn ngắn",
    loai: ["nghe", "all"],
    group: "structure",
  },
  {
    type: "accordion",
    label: "Accordion kỹ năng",
    description: "Giải thích chi tiết từng kỹ năng",
    loai: ["nghe", "mon_hoc", "all"],
    group: "structure",
  },
  {
    type: "path",
    label: "Lộ trình",
    description: "Các bước đánh số 1, 2, 3…",
    loai: ["nghe", "all"],
    group: "structure",
  },
  {
    type: "job-item",
    label: "Đầu việc",
    description: "Một công việc cụ thể trong ngày",
    loai: ["nghe", "all"],
    group: "content",
  },
  {
    type: "infobox",
    label: "Infobox",
    description: "Hộp thông tin nổi bật",
    loai: ["nghe", "all"],
    group: "content",
  },
  {
    type: "image-placeholder",
    label: "Placeholder ảnh",
    description: "Gợi ý keyword tìm ảnh",
    loai: ["all"],
    group: "media",
  },
];

export function paletteForLoai(loaiBaiViet: string): BlockPaletteEntry[] {
  const key = loaiBaiViet.trim() || "all";
  return BLOCK_PALETTE.filter(
    (b) =>
      b.loai.includes("all") ||
      (b.loai as readonly string[]).includes(key),
  );
}

export function createBlockNode(type: BlockNode["type"]): BlockNode {
  switch (type) {
    case "skill-grid":
      return { type, attrs: { items: [...DEFAULT_SKILL_ITEMS] } };
    case "accordion":
      return {
        type,
        attrs: { items: defaultAccordionFromSkills() },
      };
    case "path":
      return { type, attrs: { steps: [...DEFAULT_PATH_STEPS] } };
    case "job-item":
      return {
        type,
        attrs: {
          title: "1. Tên đầu việc",
          body: "Mô tả — làm gì, tại sao quan trọng, kết quả trông như thế nào.",
        },
      };
    case "infobox":
      return {
        type,
        attrs: {
          label: "Lưu ý",
          body: "Thông tin quan trọng cần nhấn mạnh trong section này.",
        },
      };
    case "image-placeholder":
      return {
        type,
        attrs: {
          label: "Gợi ý tìm ảnh",
          keywords: "keyword tiếng Anh — nghề + context",
          wide: false,
        },
      };
    case "paragraph":
      return { type, attrs: { text: "Đoạn văn mới." } };
    case "lead":
      return { type, attrs: {} };
    case "section":
      return {
        type,
        attrs: { title: "Tiêu đề section", hint: "", children: [] },
      };
    default:
      return { type: "paragraph", attrs: { text: "" } };
  }
}

type NgheSectionDef = { title: string; hint: string; blocks: BlockNode[] };

const NGHE_DONG_GOP_SECTIONS: NgheSectionDef[] = [
  {
    title: "Tổng quan",
    hint: "Nghề này làm gì, trong bối cảnh nào.",
    blocks: [],
  },
  {
    title: "Công việc hàng ngày",
    hint: "Một ngày điển hình trông như thế nào.",
    blocks: [createBlockNode("job-item")],
  },
  {
    title: "Kỹ năng cần có",
    hint: "Hard skill và soft skill quan trọng.",
    blocks: [createBlockNode("skill-grid"), createBlockNode("accordion")],
  },
  {
    title: "Lộ trình phát triển",
    hint: "Junior → senior, học thêm gì.",
    blocks: [createBlockNode("path")],
  },
];

const KEYWORD_SECTIONS: NgheSectionDef[] = [
  { title: "Khái niệm", hint: "Giải thích ngắn gọn thuật ngữ.", blocks: [] },
  { title: "Thành phần", hint: "Các phần / yếu tố chính.", blocks: [] },
  { title: "Ví dụ", hint: "Minh họa thực tế.", blocks: [] },
  {
    title: "Tài liệu tham khảo",
    hint: "Link hoặc nguồn đáng tin.",
    blocks: [],
  },
];

function sectionsForLoai(
  loaiBaiViet: string,
): NgheSectionDef[] {
  if (loaiBaiViet === "nghe") return NGHE_DONG_GOP_SECTIONS;
  if (loaiBaiViet === "keyword") return KEYWORD_SECTIONS;
  return [
    { title: "Giới thiệu", hint: "Tóm tắt chủ đề.", blocks: [] },
    {
      title: "Nội dung chi tiết",
      hint: "Phần thân bài.",
      blocks: [],
    },
  ];
}

/** Document khung đóng góp — dùng compileArticleHtml → noi_dung. */
export function buildDongGopDocument(
  loaiBaiViet: string,
  entityTitle?: string | null,
): ArticleDocument {
  const sections = sectionsForLoai(loaiBaiViet);
  return {
    version: ARTICLE_DOC_VERSION,
    loaiBaiViet,
    blocks: [
      {
        type: "lead",
        attrs: { entityTitle: entityTitle?.trim() || undefined },
      },
      ...sections.map(
        (s): BlockNode => ({
          type: "section",
          attrs: {
            title: s.title,
            hint: s.hint,
            children: s.blocks,
          },
        }),
      ),
    ],
  };
}
