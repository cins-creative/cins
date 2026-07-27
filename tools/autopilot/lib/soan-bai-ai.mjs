/**
 * Soạn tiêu đề + mô tả ngắn kiểu curator (Giai đoạn 4).
 * Attribution (dong_ghi_nguon) luôn ghép bằng template — không nhờ AI.
 */

const TIEU_DE_MAX = 120;
const MO_TA_MAX = 400;

function truncate(s, max) {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function tenNenTang(nen) {
  if (nen === "artstation") return "ArtStation";
  if (nen === "behance") return "Behance";
  return "nguồn ngoài";
}

/** Fallback không cần Claude. */
export function soanBaiHeuristic(params) {
  const nen = tenNenTang(params.nenTang);
  const goc = truncate(params.tieuDeGoc || "", TIEU_DE_MAX);
  const tacGia = String(params.tenTacGia || "").trim();

  const tieuDe =
    goc && !/^https?:/i.test(goc)
      ? goc
      : tacGia
        ? `Gợi ý từ ${nen}: ${tacGia}`
        : `Gợi ý từ ${nen}`;

  let moTa = truncate(params.moTaGoc || "", MO_TA_MAX);
  if (!moTa) {
    moTa = tacGia
      ? `Chia sẻ tác phẩm của ${tacGia} trên ${nen} — tham khảo phong cách, không phải portfolio cá nhân.`
      : `Chia sẻ tác phẩm đáng chú ý trên ${nen} — xem bản gốc qua liên kết.`;
  }

  return { tieuDe: truncate(tieuDe, TIEU_DE_MAX), moTa, usedClaude: false };
}

function extractTag(text, tag) {
  const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "i");
  const m = String(text || "").match(re);
  if (!m) return "";
  return m[0].slice(tag.length + 2, -(tag.length + 3)).trim();
}

/**
 * @param {{
 *   tieuDeGoc?: string|null,
 *   moTaGoc?: string|null,
 *   tenTacGia?: string|null,
 *   nenTang: string,
 *   urlCanonic: string,
 *   slugNick: string,
 * }} params
 */
export async function soanBaiCurator(params) {
  const fallback = soanBaiHeuristic(params);
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return fallback;

  const nen = tenNenTang(params.nenTang);
  const tacGia = String(params.tenTacGia || "").trim() || "(không rõ)";

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
        max_tokens: 500,
        system: [
          "Bạn viết caption Journey CINs kiểu curator / giới thiệu tác phẩm ngoài.",
          "Người đăng chỉ ĐANG CHIA SẺ link — KHÔNG phải tác giả ảnh gốc.",
          "CẤM: tôi vẽ, portfolio của mình, tác phẩm của tôi, mình làm, commission của tôi (trừ khi nói rõ đang giới thiệu người khác).",
          "BẮT BUỘC: giọng giới thiệu / gợi ý tham khảo; tiếng Việt tự nhiên, ấm, ngắn.",
          "Trả về ĐÚNG XML:",
          "<tieu_de>...</tieu_de>",
          "<mo_ta>...</mo_ta>",
          `tieu_de: tối đa ${TIEU_DE_MAX} ký tự, không hashtag spam.`,
          `mo_ta: 1–3 câu, tối đa ${MO_TA_MAX} ký tự; có thể nhắc tên artist nguồn.`,
          "Không giải thích ngoài XML. Không bịa giải thưởng / số liệu.",
        ].join("\n"),
        messages: [
          {
            role: "user",
            content: [
              `Nick đăng (curator): @${params.slugNick}`,
              `Nền tảng: ${nen}`,
              `Artist nguồn: ${tacGia}`,
              `URL: ${params.urlCanonic}`,
              `Tiêu đề gốc: ${params.tieuDeGoc || "(trống)"}`,
              `Mô tả gốc: ${(params.moTaGoc || "").slice(0, 1200) || "(trống)"}`,
            ].join("\n"),
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn(`  AI soạn HTTP ${res.status} → heuristic`);
      return fallback;
    }

    const data = await res.json();
    const text =
      data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    const tieuDe = extractTag(text, "tieu_de") || fallback.tieuDe;
    const moTa = extractTag(text, "mo_ta") || fallback.moTa;

    return {
      tieuDe: truncate(tieuDe, TIEU_DE_MAX) || fallback.tieuDe,
      moTa: truncate(moTa, MO_TA_MAX) || fallback.moTa,
      usedClaude: true,
    };
  } catch (e) {
    console.warn(`  AI soạn lỗi: ${e?.message || e} → heuristic`);
    return fallback;
  }
}

/** Dòng ghi nguồn cố định — không AI. */
export function taoDongGhiNguon({ nenTang, tenTacGia, urlCanonic }) {
  const nen = tenNenTang(nenTang);
  const tacGia = String(tenTacGia || "").trim();
  if (tacGia) {
    return `Giới thiệu từ ${nen} — ${tacGia}. Xem bản gốc: ${urlCanonic}`;
  }
  return `Giới thiệu từ ${nen}. Xem bản gốc: ${urlCanonic}`;
}
