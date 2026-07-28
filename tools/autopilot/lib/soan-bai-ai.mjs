/**
 * Soạn tiêu đề + mô tả theo văn phong 10 nick (§1b).
 * Attribution (dong_ghi_nguon) luôn ghép bằng template — không nhờ AI.
 */

const TIEU_DE_MAX = 120;
const MO_TA_MAX = 400;

const NICK_VOICE = {
  kiritominh: {
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
  hinatavy: {
    giong: "Êm, cảm xúc; nhìn tranh yên.",
    mau: [
      "hôm nay chỉ muốn nhìn tranh yên ẻm / Noon của WLOP — ngồi nhìn một lúc hết buồn luôn ✨",
    ],
    mauHeuristic: [
      "hôm nay chỉ muốn nhìn một lúc… yên thật ✨",
      "save rồi chắc lại quên mở ra — nhưng vibe thì nhớ",
      "ngồi nhìn một lúc hết ồn trong đầu luôn",
    ],
  },
  levikhoa: {
    giong: "Ít chữ. Ít emoji.",
    mau: ["ref sạch. để đó."],
    mauHeuristic: ["ref. để đó.", "sạch.", "ổn.", "để ref."],
  },
  yukitrang: {
    giong: "Nghề nhưng nói thường; có thể mệt + xin feedback.",
    mau: [
      "học lại bộ môn quan sát weight trong pose đứng… mệt quá ☕ / có cao nhân nào nhìn giúp mình với 🙏",
    ],
    mauHeuristic: [
      "đứng yên mà vẫn thấy có lực. mệt quá ☕ xin mắt nhìn giúp 🙏",
      "đang học quan sát weight… để soi ☕",
      "cái này trên {nen} hay quá — ai có tip nhìn silhouette không 🙏",
    ],
  },
  sakuralinh: {
    giong: "Dễ thương, browse; emoji 🤡✨ được.",
    mau: [
      "Noon (WLOP) — màu kiểu chapter buồn buồn là hết nước chấm 🤡✨",
    ],
    mauHeuristic: [
      "vibe dịu, hết nước chấm 🤡✨",
      "browse {nen} save vì màu chapter buồn buồn ✨",
      "cover vibe này mình đang thích 🤡",
    ],
  },
  remnhi: {
    giong: "Thật thà, đang dựng folio; không nhận mình vẽ.",
    mau: [
      "folio mình đang thiếu bài “ánh sáng rõ ràng” nên cứ thấy cái nào ổn là đăng lại để tự soi 🥲",
    ],
    mauHeuristic: [
      "folio đang thiếu vibe này nên lưu lại tự soi 🥲",
      "đẹp thật… mình chưa làm được đoạn này",
      "đang dựng folio — để soi ánh sáng / layout",
    ],
  },
  itachihung: {
    giong: "Cực ngắn.",
    mau: ["Noon — WLOP / ổn."],
    mauHeuristic: ["ổn.", "để ref.", "hay."],
  },
  mikungoc: {
    giong: "Nhẹ, rõ; thỉnh thoảng cho lớp xem.",
    mau: [
      "mai cho lớp xem ảnh này / để ý sáng đổ trên mặt là đủ chiều sâu rồi… ☀️",
    ],
    mauHeuristic: [
      "mai cho lớp xem — để ý sáng đổ là đủ chiều sâu ☀️",
      "nhẹ mà rõ… để lớp soi",
      "lớp hay xem mấy bài kiểu này",
    ],
  },
  nezukochi: {
    giong: "Màu một chút; emoji nhẹ.",
    mau: [
      "tone ấm mà không bị vàng cháy… ưng bảng này quá / đang lấy ref color cho chap webtoon 🔥",
    ],
    mauHeuristic: [
      "ưng bảng màu quá 🔥",
      "tone này đang lấy ref color cho chap…",
      "màu ấm mà không cháy ✨",
    ],
  },
  zorobao: {
    giong: "Đọc tranh; thích trang rõ.",
    mau: ["đọc như splash 1 trang là hết / không rối. thích."],
    mauHeuristic: [
      "một trang là hết, không rối. thích.",
      "đọc rõ. để đó.",
      "không rối. ổn.",
    ],
  },
};

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
  if (nen === "pixiv") return "Pixiv";
  return "nguồn ngoài";
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fillTemplate(tpl, vars) {
  return tpl
    .replace(/\{ten\}/g, vars.ten || "bài này")
    .replace(/\{tacGia\}/g, vars.tacGia || "artist")
    .replace(/\{nen\}/g, vars.nen);
}

/** Bỏ dấu hiệu caption bot / note AI — tên artwork đã nằm ở tieu_de. */
export function lamSachMoTaCaption(moTa) {
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

function tieuDeTuSlugBehance(url) {
  try {
    const path = new URL(String(url || "").trim()).pathname;
    const m = path.match(/\/gallery\/\d+\/([^/]+)/i);
    if (!m?.[1]) return null;
    const slug = decodeURIComponent(m[1]).replace(/[-_]+/g, " ").trim();
    if (!slug || /^(p|project)$/i.test(slug)) return null;
    return slug.slice(0, 200);
  } catch {
    return null;
  }
}

function chuanHoaTieuDeGoc(params) {
  const raw = truncate(params.tieuDeGoc || "", TIEU_DE_MAX);
  const ok =
    raw &&
    !/^https?:/i.test(raw) &&
    !/^Behance\s+\d+$/i.test(raw) &&
    !/^ArtStation\s+/i.test(raw) &&
    !/^Pixiv\s+\d+$/i.test(raw)
      ? raw
      : "";
  if (ok) return ok;
  if (params.nenTang === "behance" && params.urlCanonic) {
    const slug = tieuDeTuSlugBehance(params.urlCanonic);
    if (slug) return truncate(slug, TIEU_DE_MAX);
  }
  return "";
}

function layVoice(slug) {
  const key = String(slug || "")
    .trim()
    .toLowerCase();
  return (
    NICK_VOICE[key] || {
      giong: "Curator / share ref — tiếng Việt tự nhiên.",
      mau: [],
      mauHeuristic: [
        "thấy trên {nen} — lưu làm ref",
        "…đang để soi",
        "save lại =))",
      ],
    }
  );
}

/**
 * Tên tác giả hợp lệ để hiển thị — bỏ ID số (vd. pixiv userId `69328034`) và rỗng.
 */
function tenTacGiaHopLe(raw) {
  const s = String(raw || "").trim();
  if (!s || /^\d+$/.test(s)) return null;
  /* Chuỗi chung của pixiv (quét nhầm trang, không phải tên artist). */
  if (/^Online community for artists/i.test(s) || /^pixiv$/i.test(s)) {
    return null;
  }
  return s;
}

/** Fallback không cần Claude — theo voice nick. */
export function soanBaiHeuristic(params) {
  const nen = tenNenTang(params.nenTang);
  const voice = layVoice(params.slugNick);
  const tenArtist = tenTacGiaHopLe(params.tenTacGia);
  /*
   * Pixiv: tiêu đề luôn là «Tham khảo {tên artist}» — KHÔNG dùng tiêu đề gốc
   * (tags lộn xộn). Tên artist thật lấy lại từ ajax lúc đăng; chưa có tên →
   * để trống (bài đăng không tiêu đề, theo yêu cầu).
   * Nền khác: giữ tiêu đề gốc; không có → «Tham khảo {artist}»; vẫn không → trống.
   */
  const ten =
    params.nenTang === "pixiv"
      ? tenArtist
        ? `Tham khảo ${tenArtist}`
        : ""
      : chuanHoaTieuDeGoc(params) ||
        (tenArtist ? `Tham khảo ${tenArtist}` : "");
  const tacGia = String(params.tenTacGia || "").trim();
  const list = voice.mauHeuristic?.length
    ? voice.mauHeuristic
    : ["thấy trên {nen} — lưu làm ref"];
  const idx =
    hashStr(`${params.slugNick || ""}|${params.urlCanonic || ""}`) %
    list.length;
  const moTa = truncate(
    lamSachMoTaCaption(
      fillTemplate(list[idx], { ten, tacGia, nen }),
    ),
    MO_TA_MAX,
  );
  return { tieuDe: truncate(ten, TIEU_DE_MAX), moTa, usedClaude: false };
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
  const voice = layVoice(params.slugNick);
  const tacGia = tenTacGiaHopLe(params.tenTacGia) || "(không rõ)";
  const tieuDeGoc = chuanHoaTieuDeGoc(params) || fallback.tieuDe;

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
          voice.mau?.length
            ? `Mẫu giọng (neo, đừng copy nguyên): ${voice.mau.join(" | ")}`
            : "",
          "Người đăng CHỈ đang chia sẻ link nguồn ngoài — KHÔNG phải tác giả ảnh gốc.",
          "CẤM về ảnh đang share: tôi vẽ, tranh mình, portfolio mình, mình làm, commission mình.",
          "ĐƯỢC: mình thấy / save / đang học / cho lớp xem ref / xin feedback cách nhìn.",
          "Texture: emoji hoặc text kiểu =)) <3 ^^ khi hợp giọng; độ dài LỆCH — không đều 2 câu ấm mỗi bài.",
          "mo_ta KHÔNG lặp tên artwork (đã có ở tieu_de); CẤM «», |pipe|, #tag, markdown * **, ref lớp: / ref:.",
          "CẤM giọng bot: «Chia sẻ tác phẩm của X trên… tham khảo phong cách…».",
          "tieu_de = TÊN artwork gốc; mo_ta = caption theo giọng nick.",
          "Trả về ĐÚNG XML:",
          "<tieu_de>...</tieu_de>",
          "<mo_ta>...</mo_ta>",
          `tieu_de ≤ ${TIEU_DE_MAX} ký tự; mo_ta ≤ ${MO_TA_MAX} ký tự.`,
          "Không giải thích ngoài XML.",
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
      console.warn(`  AI soạn HTTP ${res.status} → heuristic`);
      return fallback;
    }

    const data = await res.json();
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
    console.warn(`  AI soạn lỗi: ${e?.message || e} → heuristic`);
    return fallback;
  }
}

/** Dòng ghi nguồn cố định — không AI. */
export function taoDongGhiNguon({ urlCanonic }) {
  return `Nguồn: ${String(urlCanonic || "").trim()}`;
}
