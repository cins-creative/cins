import { SHOP_NHOM_NHAN_MAX } from "@/lib/shop/nhom";
import { SHOP_NHOM_MO_TA_MAX } from "@/lib/shop/types";

import type { ShopeeProductDraft } from "./types";

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

/** Heuristic không cần Claude — đủ khi title/mô tả ngắn. */
export function heuristicNormalize(draft: ShopeeProductDraft): {
  nhan: string;
  moTa: string;
} {
  let nhan = draft.title
    .replace(/^\[.*?\]\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
  nhan = truncate(nhan, SHOP_NHOM_NHAN_MAX);

  let moTa = draft.description
    .replace(/💗/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
  // Ưu tiên bullet lines
  const lines = moTa
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    moTa = lines
      .map((l) => (l.startsWith("-") || l.startsWith("•") ? l : `- ${l}`))
      .join("\n");
  }
  moTa = truncate(moTa, SHOP_NHOM_MO_TA_MAX);

  return { nhan: nhan || "Loại Shopee", moTa };
}

/**
 * Claude rút tên ≤ 40 và mô tả ≤ 280.
 * Fallback heuristic nếu thiếu key / lỗi API.
 */
export async function claudeNormalizeShopee(
  draft: ShopeeProductDraft,
): Promise<{ nhan: string; moTa: string; usedClaude: boolean }> {
  const fallback = heuristicNormalize(draft);
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { ...fallback, usedClaude: false };

  const needsClaude =
    draft.title.length > SHOP_NHOM_NHAN_MAX ||
    draft.description.length > SHOP_NHOM_MO_TA_MAX;
  if (!needsClaude) return { ...fallback, usedClaude: false };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 800,
        system: [
          "Bạn chuẩn hoá dữ liệu sản phẩm Shopee cho kho hàng CINs.",
          "Trả về ĐÚNG XML:",
          "<nhan>...</nhan>",
          "<mota>...</mota>",
          `nhan: tên loại hàng tiếng Việt, tối đa ${SHOP_NHOM_NHAN_MAX} ký tự, không hashtag, không '| Shopee'.`,
          `mota: mô tả ngắn tiếng Việt, tối đa ${SHOP_NHOM_MO_TA_MAX} ký tự; ưu tiên gạch đầu dòng '- '; giữ ý chính (kích thước, nam châm, phụ kiện…).`,
          "Không giải thích ngoài XML.",
        ].join("\n"),
        messages: [
          {
            role: "user",
            content: `Tiêu đề:\n${draft.title}\n\nMô tả:\n${draft.description.slice(0, 4000)}`,
          },
        ],
      }),
    });

    if (!res.ok) return { ...fallback, usedClaude: false };

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text =
      data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    const nhan =
      extractTag(text, "nhan") || extractTag(text, "nhãn") || fallback.nhan;
    const moTa = extractTag(text, "mota") || extractTag(text, "mô_tả") || fallback.moTa;

    return {
      nhan: truncate(nhan, SHOP_NHOM_NHAN_MAX) || fallback.nhan,
      moTa: truncate(moTa, SHOP_NHOM_MO_TA_MAX),
      usedClaude: true,
    };
  } catch {
    return { ...fallback, usedClaude: false };
  }
}

function extractTag(text: string, tag: string): string {
  const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "i");
  const m = text.match(re);
  if (!m) return "";
  return m[0].slice(tag.length + 2, -(tag.length + 3)).trim();
}
