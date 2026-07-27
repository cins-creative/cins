/**
 * Cấu hình + helper cho tương tác ảo nick seeding (Giai đoạn 7).
 *
 * Không đụng schema: emoji ghi vào `social_reaction`, comment vào `social_binh_luan`.
 * Bộ emoji CHỈ tích cực — bỏ angry (phẫn nộ) + dislike + sad.
 * Mỗi nick có "độ hoạt bát" (sociability) + phân bố emoji + pool câu khen theo giọng.
 */

import { diemTrungNiche } from "./ngay-vn.mjs";

/** Emoji được phép thả (loại angry/dislike/sad). Khớp key trong COMMENT_REACTION_EMOJIS. */
export const SEED_EMOJI = [
  "heart",
  "thumbsup",
  "joy",
  "wow",
  "party",
  "fire",
  "clap",
  "hundred",
];

const SEED_EMOJI_SET = new Set(SEED_EMOJI);

/**
 * Cấu hình từng nick theo voice card (§1b brief).
 *   sociability: xác suất nền thả emoji lên 1 bài đủ điều kiện.
 *   emoji: trọng số phân bố emoji (chỉ dùng key trong SEED_EMOJI).
 *   khen: pool câu khen chung (comment lên bài NGƯỜI KHÁC — không xưng tác giả).
 */
export const NICK_TUONG_TAC = {
  kiritominh: {
    sociability: 0.86,
    emoji: { fire: 3, heart: 2, hundred: 2, wow: 2, clap: 1 },
    khen: [
      "cái này lên moodboard mình luôn 🔥",
      "ánh sáng ngon ghê, để ref",
      "vibe fantasy đúng gu mình rồi",
      "pose có lực thật sự, thích",
      "màu này cứu deadline mình huhu",
      "đỉnh, save lại học dần",
      "nhìn là biết chăm chút, nể",
      "concept chắc tay quá",
      "ngồi ngắm hoài không chán",
      "chi tiết ổn áp, làm tốt lắm",
      "cho xin vía tay nghề với 😭",
      "quá xịn, hóng thêm bài",
    ],
  },
  hinatavy: {
    sociability: 0.82,
    emoji: { heart: 4, wow: 2, clap: 1, party: 1 },
    khen: [
      "nhìn êm cả mắt luôn ✨",
      "màu dịu quá, cưng ghê",
      "ngồi nhìn một lúc thấy nhẹ người",
      "ánh sáng chiều đúng mood mình thích",
      "cảm giác bình yên thật sự",
      "đẹp mà không cố, thích cái đó",
      "tone này chữa lành ghê",
      "xinh xỉu, lưu liền",
      "nhẹ nhàng mà vẫn có chiều sâu",
      "thương cái vibe này quá",
      "làm mình muốn vẽ lại luôn",
      "đẹp dịu dàng ẻm ơi 🥹",
    ],
  },
  levikhoa: {
    sociability: 0.72,
    emoji: { thumbsup: 5, hundred: 2, fire: 1 },
    khen: [
      "sạch. ưng.",
      "silhouette rõ, ổn",
      "chắc tay",
      "gọn mà đủ, thích",
      "ref tốt",
      "form đẹp",
      "ngon",
      "để ý sáng khối tốt đấy",
      "clean thật",
      "đọc được ngay, xịn",
      "ổn áp",
      "tay nghề đây rồi",
    ],
  },
  yukitrang: {
    sociability: 0.8,
    emoji: { clap: 3, heart: 2, fire: 2, thumbsup: 1 },
    khen: [
      "timing mượt quá trời ☕",
      "chuyển động có hồn ghê",
      "weight đứng chắc, nể",
      "làm animation kiểu này cực lắm, tôn trọng",
      "mượt mà, học hỏi ạ",
      "flow đẹp thật sự",
      "công phu quá, clap 👏",
      "nhìn là biết đổ mồ hôi rồi",
      "chắc nghề, thích",
      "cái này xịn nha",
      "đỉnh, lưu lại tham khảo",
      "làm tốt lắm luôn",
    ],
  },
  sakuralinh: {
    sociability: 0.88,
    emoji: { heart: 4, party: 2, fire: 2, clap: 1 },
    khen: [
      "màu cưng xỉu ✨🤡",
      "vibe cover này hết nước chấm",
      "pastel ngọt ghê luôn",
      "iu cái bảng màu này quá",
      "xinh muốn xỉu 🥰",
      "ngọt lịm tim, save liền",
      "duyên ghê, thích thật sự",
      "màu này chuẩn gu mình 🔥",
      "cưng không chịu được",
      "đẹp iu, làm tiếp đi ạ",
      "mê cái mood này",
      "tuyệt vời ông mặt trời 🎉",
    ],
  },
  remnhi: {
    sociability: 0.78,
    emoji: { heart: 3, thumbsup: 2, clap: 2, wow: 1 },
    khen: [
      "đẹp thật, mình còn chưa làm được đoạn này 🥲",
      "chắc tay ghê, ngưỡng mộ",
      "học hỏi được nhiều, cảm ơn đã share",
      "portfolio kiểu này là chuẩn rồi",
      "character design ổn áp lắm",
      "nhìn có nghề thật sự",
      "cố gắng của bạn thấy rõ luôn",
      "xịn, lưu lại soi dần",
      "làm tốt lắm, tiếp tục nha",
      "mình mê cái độ chỉn chu này",
      "ánh sáng rõ ràng ghê, nể",
      "quá ổn luôn ạ",
    ],
  },
  itachihung: {
    sociability: 0.68,
    emoji: { thumbsup: 4, hundred: 2, fire: 1 },
    khen: [
      "ổn.",
      "ngon",
      "tone tối chuẩn",
      "chất",
      "đỉnh nha",
      "để ref",
      "ưng",
      "chắc tay",
      "xịn",
      "gắt đấy",
      "ok lắm",
      "đẹp",
    ],
  },
  mikungoc: {
    sociability: 0.83,
    emoji: { heart: 3, party: 2, clap: 2, thumbsup: 1 },
    khen: [
      "dễ thương ghê, cho lớp mình xem nha ☀️",
      "nét cưng quá trời",
      "nhìn là vui rồi 🥰",
      "màu tươi, thích lắm",
      "chibi kiểu này ai mà không mê",
      "đáng yêu xỉu, làm tốt lắm",
      "rõ ràng dễ nhìn, xịn",
      "bé bé xinh xinh cưng ghê",
      "vui mắt thật sự",
      "học trò mình chắc mê cái này",
      "ngọt ngào quá đi",
      "tuyệt vời luôn ạ 🎉",
    ],
  },
  nezukochi: {
    sociability: 0.81,
    emoji: { fire: 3, heart: 2, wow: 2, clap: 1 },
    khen: [
      "ưng cái bảng màu này quá 🔥",
      "tone ấm mà không cháy, đỉnh",
      "màu chữa lành ghê",
      "lấy ref color liền",
      "phối màu có gu thật sự",
      "warm palette đúng gu mình",
      "đẹp ngọt luôn",
      "nhìn ấm áp ghê",
      "màu này mê quá đi",
      "xịn, save vào folder ref",
      "cảm giác dịu mà vẫn nổi, hay",
      "quá ưng luôn ạ",
    ],
  },
  zorobao: {
    sociability: 0.7,
    emoji: { thumbsup: 4, hundred: 2, clap: 1 },
    khen: [
      "đọc một trang là hết, không rối. thích",
      "bố cục sạch ghê",
      "kể chuyện tốt đấy",
      "nét dứt khoát, ổn",
      "storyboard chắc tay",
      "rõ ràng dễ theo dõi",
      "ngon",
      "để ref",
      "chất",
      "làm tốt lắm",
      "ưng cái flow này",
      "đỉnh nha",
    ],
  },
};

/** Cấu hình mặc định cho nick chưa khai báo. */
const MAC_DINH = {
  sociability: 0.75,
  emoji: { heart: 3, thumbsup: 2, fire: 1, clap: 1 },
  khen: [
    "đẹp ghê, làm tốt lắm",
    "xịn thật sự, lưu lại",
    "ưng cái này quá",
    "ngon, để ref",
    "chắc tay ghê",
    "quá ổn luôn ạ",
    "nhìn thích thật",
    "học hỏi nha, cảm ơn đã share",
  ],
};

export function cauHinhNick(slug) {
  return NICK_TUONG_TAC[String(slug || "").toLowerCase()] || MAC_DINH;
}

/* ── RNG seeded (mulberry32 + hash chuỗi) — quyết định ổn định giữa các lần chạy ── */

function hashChuoi(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Trả số thực [0,1) ổn định theo seed chuỗi. */
export function rngSeed(seed) {
  let a = hashChuoi(String(seed));
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chọn phần tử theo trọng số (r ∈ [0,1)). */
export function chonTheoTrongSo(weights, r) {
  const entries = Object.entries(weights).filter(([k]) => SEED_EMOJI_SET.has(k));
  const tong = entries.reduce((s, [, w]) => s + Math.max(0, w), 0);
  if (tong <= 0) return SEED_EMOJI[0];
  let x = r * tong;
  for (const [k, w] of entries) {
    x -= Math.max(0, w);
    if (x < 0) return k;
  }
  return entries[entries.length - 1][0];
}

/**
 * Xác suất nick thả emoji lên 1 bài.
 *   base = sociability của nick.
 *   Nếu tác giả là nick seed khác → cộng/trừ theo khớp niche.
 *   Người thật (không rõ niche) → giữ base.
 * Clamp [0.4, 0.95] để số reaction dao động, tránh 100% đồng loạt lộ bot.
 */
export function xacSuatThaEmoji(nick, nicheTacGia) {
  let p = cauHinhNick(nick.slug).sociability;
  if (Array.isArray(nicheTacGia) && nicheTacGia.length) {
    const trung = diemTrungNiche(nick.niche || [], nicheTacGia);
    p += trung > 0 ? Math.min(0.1, 0.05 * trung) : -0.12;
  }
  return Math.max(0.4, Math.min(0.95, p));
}

/* ── Lịch ghé thăm: 4 phiên/ngày, gap khác nhau theo nick + theo ngày ── */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
/** 4 khung giờ VN — mỗi phiên jitter trong khung → gap lệch nhau. */
const KHUNG_GIO = [
  [7, 11],
  [11, 15],
  [15, 19],
  [19, 24],
];

function ngayVnParts(now) {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return {
    y: vn.getUTCFullYear(),
    m: vn.getUTCMonth() + 1,
    d: vn.getUTCDate(),
    key: `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, "0")}-${String(vn.getUTCDate()).padStart(2, "0")}`,
  };
}

/** 4 mốc ghé (epoch ms UTC) của 1 nick trong ngày VN chứa `refNow`. */
export function lichGheThamNgay(slug, refNow) {
  const { y, m, d, key } = ngayVnParts(refNow);
  const rnd = rngSeed(`${slug}|${key}|lich`);
  return KHUNG_GIO.map(([tu, den], i) => {
    void i;
    const gio = tu + rnd() * (den - tu);
    const gioInt = Math.floor(gio);
    const phut = Math.floor((gio - gioInt) * 60);
    // VN time (y,m,d gioInt:phut) → UTC epoch
    return Date.UTC(y, m - 1, d, gioInt - 7, phut, 0, 0);
  });
}

/**
 * Nick có "tới cữ ghé" trong cửa sổ (now - windowMin, now] không?
 * Xét cả lịch hôm nay + hôm qua (VN) để không sót phiên gần ranh giới.
 */
export function nickToiCuGheTham(slug, now, windowMin) {
  const nowMs = now.getTime();
  const canDuoi = nowMs - windowMin * 60 * 1000;
  const homQua = new Date(nowMs - 24 * 60 * 60 * 1000);
  const slots = [...lichGheThamNgay(slug, now), ...lichGheThamNgay(slug, homQua)];
  return slots.some((s) => s > canDuoi && s <= nowMs);
}
