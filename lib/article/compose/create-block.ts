import { newComposeBlockId } from "@/lib/article/compose/id";
import type {
  ArticleComposeBlock,
  ArticleComposeBlockType,
} from "@/lib/article/compose/types";

const DEFAULT_TABLE_ROWS = [
  ["Tiêu đề cột 1", "Tiêu đề cột 2", "Tiêu đề cột 3"],
  ["", "", ""],
  ["", "", ""],
];

export function createComposeBlock(
  type: ArticleComposeBlockType,
): ArticleComposeBlock {
  const id = newComposeBlockId();
  const block: ArticleComposeBlock = { id, t: type };

  if (type === "h2" || type === "h3" || type === "body" || type === "quote") {
    block.text = "";
  }
  if (type === "list-ul" || type === "list-ol") {
    block.items = [""];
  }
  if (type === "table") {
    block.tableRows = DEFAULT_TABLE_ROWS.map((row) => [...row]);
    block.tableHeader = true;
  }
  if (type === "imgs") {
    block.imgLabel = "Gợi ý tìm ảnh";
    block.imgKeywords = "";
    block.imgCaption = "";
  }
  if (type === "embed") {
    block.embedUrl = "";
  }
  if (type === "spacer") {
    block.size = "m";
  }
  if (type === "divider") {
    block.dividerLen = 8;
    block.dividerThick = "med";
  }

  return block;
}
