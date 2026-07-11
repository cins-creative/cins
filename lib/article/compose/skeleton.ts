import { compileComposeBlocksToHtml } from "@/lib/article/compose/compile";
import { createComposeBlock } from "@/lib/article/compose/create-block";
import type { ArticleComposeBlock } from "@/lib/article/compose/types";

type SectionHint = { title: string; hint?: string };

const NGHE_SECTIONS: SectionHint[] = [
  { title: "Tổng quan", hint: "Nghề này làm gì, trong bối cảnh nào." },
  { title: "Công việc hàng ngày", hint: "Một ngày điển hình trông như thế nào." },
  { title: "Kỹ năng cần có", hint: "Hard skill và soft skill quan trọng." },
  { title: "Lộ trình phát triển", hint: "Junior → senior, học thêm gì." },
];

const KEYWORD_SECTIONS: SectionHint[] = [
  { title: "Khái niệm", hint: "Giải thích ngắn gọn thuật ngữ." },
  { title: "Thành phần", hint: "Các phần / yếu tố chính." },
  { title: "Ví dụ", hint: "Minh họa thực tế." },
  { title: "Tài liệu tham khảo", hint: "Link hoặc nguồn đáng tin." },
];

function sectionsForLoai(loaiBaiViet: string): SectionHint[] {
  if (loaiBaiViet === "nghe") return NGHE_SECTIONS;
  if (loaiBaiViet === "keyword") return KEYWORD_SECTIONS;
  return [
    { title: "Giới thiệu", hint: "Tóm tắt chủ đề." },
    { title: "Nội dung chi tiết", hint: "Phần thân bài." },
  ];
}

/** Khung soạn compose — chỉ tiêu đề section + gợi ý, không khối arc đặc biệt. */
export function buildComposeSkeleton(loaiBaiViet: string): string {
  const blocks: ArticleComposeBlock[] = [];

  for (const section of sectionsForLoai(loaiBaiViet)) {
    const h2 = createComposeBlock("h2");
    h2.text = section.title;
    blocks.push(h2);

    const body = createComposeBlock("body");
    body.text = section.hint ?? "";
    blocks.push(body);
  }

  return compileComposeBlocksToHtml(blocks);
}

/** Chuỗi chữ thuần để so khớp skeleton / body trống. */
export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Body chưa có nội dung thật — trống hoặc vẫn đúng khung gợi ý mặc định
 * (user chưa sửa gì trong editor chính).
 */
export function isComposeSkeletonOrEmpty(
  bodyHtml: string | null | undefined,
  loaiBaiViet: string,
): boolean {
  const text = plainTextFromHtml(bodyHtml ?? "");
  if (!text) return true;

  const skeletonText = plainTextFromHtml(buildComposeSkeleton(loaiBaiViet));
  if (text === skeletonText) return true;

  // Chỉ còn tiêu đề section khung, chưa có đoạn gợi ý / nội dung thêm.
  const titlesOnly = plainTextFromHtml(
    sectionsForLoai(loaiBaiViet)
      .map((s) => `<h2>${s.title}</h2>`)
      .join(""),
  );
  if (text === titlesOnly) return true;

  return false;
}
