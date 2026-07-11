import type {
  ArticleDocument,
  ValidationIssue,
  ValidationResult,
} from "@/lib/article/blocks/types";

function hasBlockType(doc: ArticleDocument, type: string): boolean {
  for (const block of doc.blocks) {
    if (block.type === type) return true;
    if (block.type === "section") {
      for (const child of block.attrs.children) {
        if (child.type === type) return true;
      }
    }
  }
  return false;
}

function sectionCount(doc: ArticleDocument): number {
  return doc.blocks.filter((b) => b.type === "section").length;
}

/** Kiểm tra chất lượng bản đóng góp trước lưu / gửi duyệt. */
export function validateArticleDocument(
  doc: ArticleDocument,
  opts?: { strict?: boolean },
): ValidationResult {
  const strict = opts?.strict ?? false;
  const issues: ValidationIssue[] = [];
  const loai = doc.loaiBaiViet;

  if (sectionCount(doc) < 2) {
    issues.push({
      level: strict ? "error" : "warn",
      code: "sections_min",
      message: "Nên có ít nhất 2 section có tiêu đề.",
    });
  }

  if (loai === "nghe") {
    if (!hasBlockType(doc, "skill-grid")) {
      issues.push({
        level: strict ? "warn" : "info",
        code: "nghe_skill_grid",
        message:
          "Section kỹ năng: thêm khối «Lưới kỹ năng» (6 icon) để bài trông chuyên nghiệp.",
      });
    }
    if (!hasBlockType(doc, "accordion")) {
      issues.push({
        level: strict ? "warn" : "info",
        code: "nghe_accordion",
        message:
          "Section kỹ năng: thêm «Accordion» giải thích từng kỹ năng.",
      });
    }
    if (!hasBlockType(doc, "path")) {
      issues.push({
        level: strict ? "warn" : "info",
        code: "nghe_path",
        message: "Section lộ trình: thêm khối «Lộ trình» (4–6 bước).",
      });
    }
  }

  const hasError = issues.some((i) => i.level === "error");
  return { ok: !hasError, issues };
}

/** Heuristic validate HTML thô (khi chưa parse doc). */
export function validateArticleHtml(
  html: string,
  loaiBaiViet: string,
  opts?: { strict?: boolean },
): ValidationResult {
  const t = html.trim();
  const issues: ValidationIssue[] = [];
  const strict = opts?.strict ?? false;

  if (t.length < 80) {
    issues.push({
      level: "error",
      code: "too_short",
      message: "Nội dung quá ngắn — hãy viết thêm.",
    });
  }

  if (/<script\b/i.test(t)) {
    issues.push({
      level: "error",
      code: "script",
      message: "Nội dung không hợp lệ (script).",
    });
  }

  if (loaiBaiViet === "nghe") {
    if (!/arc-skill-grid/.test(t)) {
      issues.push({
        level: strict ? "warn" : "info",
        code: "nghe_skill_grid",
        message: "Chưa có lưới kỹ năng — dùng nút «Lưới kỹ năng» trên thanh công cụ.",
      });
    }
    if (!/arc-accordion/.test(t)) {
      issues.push({
        level: strict ? "warn" : "info",
        code: "nghe_accordion",
        message: "Chưa có accordion kỹ năng.",
      });
    }
    if (!/arc-path/.test(t)) {
      issues.push({
        level: strict ? "warn" : "info",
        code: "nghe_path",
        message: "Chưa có lộ trình — dùng nút «Lộ trình».",
      });
    }
  }

  const hasError = issues.some((i) => i.level === "error");
  return { ok: !hasError, issues };
}
