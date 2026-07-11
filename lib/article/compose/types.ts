export type ArticleComposeBlockType =
  | "h2"
  | "h3"
  | "body"
  | "quote"
  | "list-ul"
  | "list-ol"
  | "table"
  | "imgs"
  | "embed"
  | "divider"
  | "spacer";

export type ArticleComposeBlock = {
  id: string;
  t: ArticleComposeBlockType;
  text?: string;
  /** Danh sách — mỗi phần tử một dòng. */
  items?: string[];
  /** Bảng — mỗi hàng là mảng ô. */
  tableRows?: string[][];
  tableHeader?: boolean;
  imgLabel?: string;
  imgKeywords?: string;
  imgCaption?: string;
  embedUrl?: string;
  size?: "s" | "m" | "l";
  dividerLen?: number;
  dividerThick?: "thin" | "med" | "thick";
};

export type ComposePickerEntry = {
  t: ArticleComposeBlockType;
  ico: string;
  name: string;
  desc: string;
};
