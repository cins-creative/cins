/** Phiên bản schema document — tăng khi đổi cấu trúc block (mobile + web). */
export const ARTICLE_DOC_VERSION = 1 as const;

export type ArticleDocVersion = typeof ARTICLE_DOC_VERSION;

export type BlockLoaiContext =
  | "all"
  | "nghe"
  | "keyword"
  | "mon_hoc"
  | "phan_mem";

export type BlockType =
  | "lead"
  | "section"
  | "skill-grid"
  | "accordion"
  | "path"
  | "job-item"
  | "infobox"
  | "image-placeholder"
  | "paragraph";

export type SkillItem = {
  icon: string;
  label: string;
};

export type AccordionItem = {
  summary: string;
  body: string;
  open?: boolean;
};

export type PathStep = {
  title: string;
  body: string;
};

export type JobItemAttrs = {
  title: string;
  body: string;
};

export type InfoboxAttrs = {
  label: string;
  body: string;
};

export type ImagePlaceholderAttrs = {
  label: string;
  keywords: string;
  wide?: boolean;
};

export type SectionAttrs = {
  title: string;
  sectionNum?: string;
  hint?: string;
  children: BlockNode[];
};

export type LeadAttrs = {
  entityTitle?: string;
};

export type BlockAttrsMap = {
  lead: LeadAttrs;
  section: SectionAttrs;
  "skill-grid": { items: SkillItem[] };
  accordion: { items: AccordionItem[] };
  path: { steps: PathStep[] };
  "job-item": JobItemAttrs;
  infobox: InfoboxAttrs;
  "image-placeholder": ImagePlaceholderAttrs;
  paragraph: { text: string };
};

export type BlockNode =
  | { type: "lead"; attrs: LeadAttrs }
  | { type: "section"; attrs: SectionAttrs }
  | { type: "skill-grid"; attrs: BlockAttrsMap["skill-grid"] }
  | { type: "accordion"; attrs: BlockAttrsMap["accordion"] }
  | { type: "path"; attrs: BlockAttrsMap["path"] }
  | { type: "job-item"; attrs: JobItemAttrs }
  | { type: "infobox"; attrs: InfoboxAttrs }
  | { type: "image-placeholder"; attrs: ImagePlaceholderAttrs }
  | { type: "paragraph"; attrs: BlockAttrsMap["paragraph"] };

export type ArticleDocument = {
  version: ArticleDocVersion;
  loaiBaiViet: string;
  blocks: BlockNode[];
};

export type BlockPaletteEntry = {
  type: BlockType;
  label: string;
  description: string;
  loai: BlockLoaiContext[];
  /** Nhóm toolbar — gom nút palette. */
  group: "section" | "content" | "media" | "structure";
};

export type ValidationLevel = "error" | "warn" | "info";

export type ValidationIssue = {
  level: ValidationLevel;
  code: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};
