export type ArticleImagePasteStatus =
  | { phase: "idle" }
  | { phase: "uploading_cf" }
  | { phase: "cf_ok"; url: string }
  | { phase: "cf_fail"; message: string }
  | { phase: "base64_ok" }
  | { phase: "base64_fail"; message: string };

export type ArticleDraftEditorVariant =
  | "default"
  | "dong-gop"
  | "nghe-lead-inline"
  | "truong-inline"
  | "nganh-admin";
