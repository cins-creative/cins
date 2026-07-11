export { escapeHtml } from "@/lib/article/blocks/escape";
export {
  ARTICLE_DOC_VERSION,
  type ArticleDocument,
  type BlockNode,
  type BlockPaletteEntry,
  type BlockType,
  type ValidationIssue,
  type ValidationResult,
} from "@/lib/article/blocks/types";
export {
  DEFAULT_PATH_STEPS,
  DEFAULT_SKILL_ITEMS,
  defaultAccordionFromSkills,
} from "@/lib/article/blocks/defaults";
export {
  compileAccordionHtml,
  compileArticleHtml,
  compileImagePlaceholderHtml,
  compileInfoboxHtml,
  compileJobItemHtml,
  compilePathHtml,
  compileSkillGridHtml,
  stripArticleWrapper,
} from "@/lib/article/blocks/compile-html";
export {
  BLOCK_PALETTE,
  buildDongGopDocument,
  createBlockNode,
  paletteForLoai,
} from "@/lib/article/blocks/registry";
export {
  validateArticleDocument,
  validateArticleHtml,
} from "@/lib/article/blocks/validate";
export {
  buildDongGopSkeleton,
  resolveDongGopEditorInitialHtml,
} from "@/lib/article/blocks/skeleton";
