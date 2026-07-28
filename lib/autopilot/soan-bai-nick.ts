/**
 * Soạn caption Autopilot theo văn phong 10 nick (§1b handoff).
 * Tiêu đề = tên artwork gốc; mô tả = giọng nick (không bot template).
 */

import "server-only";

import {
  laTieuDeThoBehance,
  tieuDeTuSlugUrlBehance,
} from "@/lib/autopilot/behance-assets";
import { nhanNenTang, type NenTangNguon } from "@/lib/editor/khoi-bai-nguon";

const TIEU_DE_MAX = 120;
const MO_TA_MAX = 400;

export type NickVoiceCard = {
  slug: string;
  giong: string;
  /** Mẫu caption (đã duyệt) — AI neo giọng; heuristic chọn biến thể. */
  mau: string[];
  /** Template heuristic — `{ten}`, `{tacGia}`, `{nen}`. */
  mauHeuristic: string[];
};

/** Voice card §1b — 10 nick seeding. */
export const NICK_VOICE_CARDS: readonly NickVoiceCard[] = [
  {
    slug: "kiritominh",
    giong: "Bạn học, hứng, hơi dài; hay kể lúc lướt ArtStation tìm ref.",
    mau: [
      "lượn ArtStation lúc 2h sáng thấy cái này / ánh sáng chiều kiểu này mình đang tìm cho mấy bài fantasy… cứu deadline moodboard luôn 😭",
    ],
    mauHeuristic: [
      "lượn {nen} thấy cái này — đang tìm ref mood kiểu này 😭",
      "save vì đang cần ánh sáng / pose kiểu này cho moodboard",
      "cái này lướt {nen} bắt được… đang học nhìn sáng trên form",
    ],
  },
  {
    slug: "hinatavy",
    giong: "Êm, cảm xúc; nhìn tranh yên; thỉnh thoảng “save rồi quên”.",
    mau: [
      "hôm nay chỉ muốn nhìn tranh yên ẻm / Noon của WLOP — ngồi nhìn một lúc hết buồn luôn ✨",
    ],
    mauHeuristic: [
      "hôm nay chỉ muốn nhìn một lúc… yên thật ✨",
      "save rồi chắc lại quên mở ra — nhưng vibe thì nhớ",
      "ngồi nhìn một lúc hết ồn trong đầu luôn",
    ],
  },
  {
    slug: "levikhoa",
    giong: "Ít chữ; gần như tên bài + nhận xét ngắn. Ít emoji.",
    mau: ["ref sạch. để đó.", "Noon — WLOP / ổn."],
    mauHeuristic: [
      "ref. để đó.",
      "sạch.",
      "ổn.",
      "để ref.",
    ],
  },
  {
    slug: "yukitrang",
    giong: "Nghề nhưng nói thường; có thể mệt + xin feedback.",
    mau: [
      "học lại bộ môn quan sát weight trong pose đứng… mệt quá ☕ / cái này đứng yên mà vẫn thấy “có lực” — có cao nhân nào nhìn giúp mình với 🙏",
    ],
    mauHeuristic: [
      "đứng yên mà vẫn thấy có lực. mệt quá ☕ xin mắt nhìn giúp 🙏",
      "đang học quan sát weight… để soi ☕",
      "cái này trên {nen} hay quá — ai có tip nhìn silhouette không 🙏",
    ],
  },
  {
    slug: "sakuralinh",
    giong: "Dễ thương, browse; khen vibe; emoji 🤡✨ được.",
    mau: [
      "Noon (WLOP) — màu kiểu chapter buồn buồn là hết nước chấm 🤡✨",
    ],
    mauHeuristic: [
      "vibe dịu, hết nước chấm 🤡✨",
      "browse {nen} save vì màu chapter buồn buồn ✨",
      "cover vibe này mình đang thích 🤡",
    ],
  },
  {
    slug: "remnhi",
    giong: "Thật thà, đang dựng folio; lưu để tự soi — không nhận mình vẽ.",
    mau: [
      "folio mình đang thiếu bài “ánh sáng rõ ràng” nên cứ thấy cái nào ổn là đăng lại để tự soi / cái này đẹp thật… mình chưa làm được đoạn sáng trên vải 🥲",
    ],
    mauHeuristic: [
      "folio đang thiếu vibe này nên lưu lại tự soi 🥲",
      "đẹp thật… mình chưa làm được đoạn này",
      "đang dựng folio — để soi ánh sáng / layout",
    ],
  },
  {
    slug: "itachihung",
    giong: "Cực ngắn; gần như tên bài + “ổn.”",
    mau: ["Noon — WLOP / ổn."],
    mauHeuristic: ["ổn.", "để ref.", "hay."],
  },
  {
    slug: "mikungoc",
    giong: "Nhẹ, rõ; thỉnh thoảng “cho lớp xem” — vẫn ghi artist nguồn.",
    mau: [
      "mai cho lớp xem ảnh này / để ý sáng đổ trên mặt là đủ chiều sâu rồi… ☀️",
    ],
    mauHeuristic: [
      "mai cho lớp xem — để ý sáng đổ là đủ chiều sâu ☀️",
      "nhẹ mà rõ… để lớp soi",
      "lớp hay xem mấy bài kiểu này",
    ],
  },
  {
    slug: "nezukochi",
    giong: "Màu một chút; ưng bảng màu; emoji nhẹ.",
    mau: [
      "tone ấm mà không bị vàng cháy… ưng bảng này quá / đang lấy ref color cho chap webtoon 🔥",
    ],
    mauHeuristic: [
      "ưng bảng màu quá 🔥",
      "tone này đang lấy ref color cho chap…",
      "màu ấm mà không cháy ✨",
    ],
  },
  {
    slug: "zorobao",
    giong: "Đọc tranh; thích trang rõ, không rối.",
    mau: ["đọc như splash 1 trang là hết / không rối. thích."],
    mauHeuristic: [
      "một trang là hết, không rối. thích.",
      "đọc rõ. để đó.",
      "không rối. ổn.",
    ],
  },
];

const VOICE_BY_SLUG = new Map(
  NICK_VOICE_CARDS.map((c) => [c.slug, c] as const),
);

export function layVoiceNick(slug: string | null | undefined): NickVoiceCard {
  const key = String(slug || "")
    .trim()
    .toLowerCase();
  return (
    VOICE_BY_SLUG.get(key) || {
      slug: key || "curator",
      giong: "Curator / share ref — tiếng Việt tự nhiên, ấm, ngắn.",
      mau: [],
      mauHeuristic: [
        "thấy trên {nen} — lưu làm ref",
        "…đang để soi",
        "save lại =))",
      ],
    }
  );
}

function truncate(s: string, max: number): string {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fillTemplate(
  tpl: string,
  vars: { ten: string; tacGia: string; nen: string },
): string {
  return tpl
    .replace(/\{ten\}/g, vars.ten || "bài này")
    .replace(/\{tacGia\}/g, vars.tacGia || "artist")
    .replace(/\{nen\}/g, vars.nen);
}

/**
 * Bỏ dấu hiệu caption bot / note AI — tên artwork đã nằm ở tieu_de.
 * Giữ emoji Unicode hoặc text kiểu =)) <3.
 */
export function lamSachMoTaCaption(moTa: string | null | undefined): string {
  let s = String(moTa || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return s;

  s = s.replace(/[«»""]/g, "");
  s = s.replace(/^\s*ref\s+lớp\s*:\s*/i, "");
  s = s.replace(/^\s*ref\s*:\s*/i, "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/_([^_]+)_/g, "$1");
  s = s.replace(/\|([^|]+)\|/g, "$1");
  s = s.replace(/(?:^|\s)#\w+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Caption cũ kiểu note AI — cần viết lại khi refresh admin/CLI. */
export function laMoTaKieuNoteAi(moTa: string | null | undefined): boolean {
  const s = String(moTa || "").trim();
  if (!s) return false;
  if (/[«»]/.test(s)) return true;
  if (/^\s*ref\s+lớp\s*:/i.test(s)) return true;
  if (/^\s*save\s+«/i.test(s)) return true;
  if (/\|[^|]+\|/.test(s)) return true;
  if (/(?:^|\s)#\w+/.test(s)) return true;
  return false;
}

/** Caption bot cũ — cần viết lại. */
export function laMoTaBotCurator(moTa: string | null | undefined): boolean {
  const s = String(moTa || "").trim();
  if (!s) return true;
  if (/^Chia sẻ tác phẩm /i.test(s)) return true;
  if (/tham khảo phong cách, không phải portfolio/i.test(s)) return true;
  if (/xem bản gốc qua liên kết/i.test(s)) return true;
  if (/^Gợi ý từ /i.test(s)) return true;
  return false;
}

function chuanHoaTieuDeGoc(params: {
  tieuDeGoc?: string | null;
  nenTang: string;
  urlCanonic?: string | null;
}): string {
  const raw = truncate(params.tieuDeGoc || "", TIEU_DE_MAX);
  const ok =
    raw &&
    !/^https?:/i.test(raw) &&
    !laTieuDeThoBehance(raw) &&
    !/^Behance\s+\d+$/i.test(raw) &&
    !/^ArtStation\s+/i.test(raw) &&
    !/^Pixiv\s+\d+$/i.test(raw)
      ? raw
      : "";
  if (ok) return ok;
  if (params.nenTang === "behance" && params.urlCanonic) {
    const slug = tieuDeTuSlugUrlBehance(params.urlCanonic);
    if (slug) return truncate(slug, TIEU_DE_MAX);
  }
  return "";
}

export type SoanBaiNickInput = {
  tieuDeGoc?: string | null;
  moTaGoc?: string | null;
  tenTacGia?: string | null;
  nenTang: string;
  urlCanonic: string;
  slugNick: string;
};

export type SoanBaiNickResult = {
  tieuDe: string;
  moTa: string;
  usedClaude: boolean;
};

/**
 * Tên tác giả hợp lệ để hiển thị — bỏ ID số (vd. pixiv userId `69328034`) và rỗng.
 */
function tenTacGiaHopLe(raw: string | null | undefined): string | null {
  const s = String(raw || "").trim();
  if (!s || /^\d+$/.test(s)) return null;
  /* Chuỗi chung của pixiv (quét nhầm trang, không phải tên artist). */
  if (/^Online community for artists/i.test(s) || /^pixiv$/i.test(s)) {
    return null;
  }
  return s;
}

/** Heuristic theo voice nick — không Claude. */
export function soanBaiHeuristicTheoNick(
  params: SoanBaiNickInput,
): SoanBaiNickResult {
  const nenTang = (
    ["artstation", "behance", "pixiv", "khac"].includes(params.nenTang)
      ? params.nenTang
      : "khac"
  ) as NenTangNguon;
  const nen = nhanNenTang(nenTang);
  const voice = layVoiceNick(params.slugNick);
  const tenArtist = tenTacGiaHopLe(params.tenTacGia);
  /*
   * Pixiv: tiêu đề «Tham khảo {tên artist}» (không dùng tiêu đề gốc tags); tên
   * thật lấy lại từ ajax lúc đăng, chưa có → trống (bài không tiêu đề).
   * Nền khác: tiêu đề gốc → «Tham khảo {artist}» → trống.
   */
  const ten =
    nenTang === "pixiv"
      ? tenArtist
        ? `Tham khảo ${tenArtist}`
        : ""
      : chuanHoaTieuDeGoc(params) ||
        (tenArtist ? `Tham khảo ${tenArtist}` : "");
  const tacGia = String(params.tenTacGia || "").trim();

  const moTaGoc = truncate(params.moTaGoc || "", MO_TA_MAX);
  let moTa = moTaGoc && !laMoTaBotCurator(moTaGoc) ? moTaGoc : "";
  if (!moTa) {
    const list = voice.mauHeuristic.length
      ? voice.mauHeuristic
      : ["thấy trên {nen} — lưu làm ref"];
    const idx = hashStr(`${params.slugNick}|${params.urlCanonic}`) % list.length;
    moTa = truncate(
      fillTemplate(list[idx]!, { ten, tacGia, nen }),
      MO_TA_MAX,
    );
  }

  return {
    tieuDe: truncate(ten, TIEU_DE_MAX),
    moTa: truncate(lamSachMoTaCaption(moTa), MO_TA_MAX),
    usedClaude: false,
  };
}

function extractTag(text: string, tag: string): string {
  const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "i");
  const m = String(text || "").match(re);
  if (!m) return "";
  return m[0].slice(tag.length + 2, -(tag.length + 3)).trim();
}

/**
 * Claude soạn theo voice nick; fallback heuristic.
 */
export async function soanBaiCuratorTheoNick(
  params: SoanBaiNickInput,
): Promise<SoanBaiNickResult> {
  const fallback = soanBaiHeuristicTheoNick(params);
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return fallback;

  const nenTang = (
    ["artstation", "behance", "pixiv", "khac"].includes(params.nenTang)
      ? params.nenTang
      : "khac"
  ) as NenTangNguon;
  const nen = nhanNenTang(nenTang);
  const voice = layVoiceNick(params.slugNick);
  const tacGia = String(params.tenTacGia || "").trim() || "(không rõ)";
  const tieuDeGoc =
    chuanHoaTieuDeGoc(params) || fallback.tieuDe;

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
          "Bạn viết caption Journey CINs — người thật trên mạng sáng tạo Việt share ref.",
          `Nick @${params.slugNick}: ${voice.giong}`,
          voice.mau.length
            ? `Mẫu giọng (neo, đừng copy nguyên): ${voice.mau.join(" | ")}`
            : "",
          "Người đăng CHỈ đang chia sẻ link nguồn ngoài — KHÔNG phải tác giả ảnh gốc.",
          "CẤM về ảnh đang share: tôi vẽ, tranh mình, portfolio mình, mình làm, commission mình.",
          "ĐƯỢC: mình thấy / save / đang học / cho lớp xem ref / xin feedback cách nhìn.",
          "Texture: emoji hoặc text kiểu =)) <3 ^^ khi hợp giọng; độ dài LỆCH (siêu ngắn / 2–4 dòng / kể chuyện) — không đều 2 câu ấm mỗi bài.",
          "mo_ta KHÔNG lặp tên artwork (đã có ở tieu_de); CẤM «», |pipe|, #tag, markdown * **, ref lớp: / ref:.",
          "CẤM giọng bot: «Chia sẻ tác phẩm của X trên… tham khảo phong cách…».",
          "tieu_de = TÊN artwork gốc (ưu tiên tiêu đề nguồn), không suffix AI.",
          "mo_ta = caption theo giọng nick; attribution nguồn để hệ thống ghi riêng — không cần nhét URL.",
          "Trả về ĐÚNG XML:",
          "<tieu_de>...</tieu_de>",
          "<mo_ta>...</mo_ta>",
          `tieu_de ≤ ${TIEU_DE_MAX} ký tự; mo_ta ≤ ${MO_TA_MAX} ký tự.`,
          "Không giải thích ngoài XML. Không bịa giải thưởng / số liệu.",
        ]
          .filter(Boolean)
          .join("\n"),
        messages: [
          {
            role: "user",
            content: [
              `Nick: @${params.slugNick}`,
              `Nền tảng: ${nen}`,
              `Artist nguồn: ${tacGia}`,
              `URL: ${params.urlCanonic}`,
              `Tiêu đề gốc (ưu tiên giữ): ${tieuDeGoc}`,
              `Mô tả gốc: ${(params.moTaGoc || "").slice(0, 1200) || "(trống)"}`,
            ].join("\n"),
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn(`[soan-bai-nick] AI HTTP ${res.status} → heuristic`);
      return fallback;
    }

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text =
      data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    const tieuDe = extractTag(text, "tieu_de") || fallback.tieuDe;
    const moTa = extractTag(text, "mo_ta") || fallback.moTa;

    return {
      /* Pixiv: bỏ tiêu đề Claude (tên artwork) — dùng «Tham khảo {artist}» / trống. */
      tieuDe:
        params.nenTang === "pixiv"
          ? fallback.tieuDe
          : truncate(tieuDe, TIEU_DE_MAX) || fallback.tieuDe,
      moTa:
        truncate(lamSachMoTaCaption(moTa), MO_TA_MAX) || fallback.moTa,
      usedClaude: true,
    };
  } catch (e) {
    console.warn(
      `[soan-bai-nick] AI lỗi: ${e instanceof Error ? e.message : e} → heuristic`,
    );
    return fallback;
  }
}
