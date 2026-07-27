// lib/cloudflare/account-hash.ts
var STORAGE_KEY = "cins-cf-images-account-hash";
var DEFAULT_CF_IMAGES_ACCOUNT_HASH = "uJ2XS8GFEXi_dIXASK1Fkw";
var memoryHash = null;
function getCfAccountHash() {
  const fromEnv = process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH?.trim();
  if (fromEnv) return fromEnv;
  if (memoryHash) return memoryHash;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)?.trim();
      if (stored) {
        memoryHash = stored;
        return stored;
      }
    } catch {
    }
  }
  return process.env.CLOUDFLARE_IMAGES_HASH?.trim() || DEFAULT_CF_IMAGES_ACCOUNT_HASH;
}

// lib/truong/image-ref.ts
function isTemporaryImageRef(value) {
  return value.startsWith("blob:") || value.startsWith("data:");
}
function isExternalHttpImageRef(value) {
  return /^https?:\/\//i.test(value.trim());
}
function isBrokenCfDeliveryUrl(url) {
  if (isTemporaryImageRef(url)) return true;
  if (/\/blob:|\/data:/.test(url)) return true;
  if (/imagedelivery\.net\/[^/]+\/https?:\/\//i.test(url)) return true;
  return false;
}

// lib/articles/cover.ts
function getCoverUrl(coverId, variant = "public") {
  const trimmed = coverId?.trim();
  if (!trimmed) return null;
  if (isExternalHttpImageRef(trimmed)) {
    return isBrokenCfDeliveryUrl(trimmed) ? null : trimmed;
  }
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${trimmed}/${variant}`;
}

// lib/journey/default-avatars.ts
var FILE_BY_ID = {
  "default-man": "man.jpg",
  "default-woman": "woman.jpg",
  "default-khac": "khac.jpg",
  "default-cins-01": "cins-01.jpg",
  "default-cins-02": "cins-02.jpg",
  "default-cins-03": "cins-03.jpg",
  "default-cins-04": "cins-04.jpg",
  "default-cins-05": "cins-05.jpg",
  "default-cins-06": "cins-06.jpg",
  "default-cins-07": "cins-07.jpg",
  "default-cins-08": "cins-08.jpg",
  "default-meme-01": "meme-01.jpg",
  "default-meme-02": "meme-02.jpg",
  "default-meme-03": "meme-03.jpg",
  "default-meme-04": "meme-04.jpg",
  "default-meme-cute-07": "meme-cute-07.jpg",
  "default-meme-cute-25": "meme-cute-25.jpg",
  "default-meme-cuoi": "meme-cuoi.jpg",
  "default-meme-hot": "meme-hot.jpg"
};
var DEFAULT_AVATAR_PATHS = Object.values(
  FILE_BY_ID
).map((file) => `/avatars/default/${file}`);
var ID_SET = new Set(Object.keys(FILE_BY_ID));
function isDefaultAvatarId(value) {
  return typeof value === "string" && ID_SET.has(value);
}
function getDefaultAvatarPublicPath(id) {
  return `/avatars/default/${FILE_BY_ID[id]}`;
}
function getDefaultAvatarUrl(avatarId) {
  if (!isDefaultAvatarId(avatarId)) return null;
  return getDefaultAvatarPublicPath(avatarId);
}

// lib/journey/profile.ts
var TINH_THANH_LABEL = {
  hcm: "TP. H\u1ED3 Ch\xED Minh",
  ha_noi: "H\xE0 N\u1ED9i",
  da_nang: "\u0110\xE0 N\u1EB5ng",
  hai_phong: "H\u1EA3i Ph\xF2ng",
  can_tho: "C\u1EA7n Th\u01A1",
  hue: "Hu\u1EBF",
  khanh_hoa: "Kh\xE1nh H\xF2a",
  lam_dong: "L\xE2m \u0110\u1ED3ng",
  dong_nai: "\u0110\u1ED3ng Nai",
  quang_ninh: "Qu\u1EA3ng Ninh",
  bac_ninh: "B\u1EAFc Ninh",
  nghe_an: "Ngh\u1EC7 An",
  ha_tinh: "H\xE0 T\u0129nh",
  thanh_hoa: "Thanh H\xF3a",
  ninh_binh: "Ninh B\xECnh",
  hung_yen: "H\u01B0ng Y\xEAn",
  phu_tho: "Ph\xFA Th\u1ECD",
  thai_nguyen: "Th\xE1i Nguy\xEAn",
  lao_cai: "L\xE0o Cai",
  tuyen_quang: "Tuy\xEAn Quang",
  cao_bang: "Cao B\u1EB1ng",
  lang_son: "L\u1EA1ng S\u01A1n",
  dien_bien: "\u0110i\u1EC7n Bi\xEAn",
  lai_chau: "Lai Ch\xE2u",
  son_la: "S\u01A1n La",
  quang_tri: "Qu\u1EA3ng Tr\u1ECB",
  quang_ngai: "Qu\u1EA3ng Ng\xE3i",
  gia_lai: "Gia Lai",
  dak_lak: "\u0110\u1EAFk L\u1EAFk",
  tay_ninh: "T\xE2y Ninh",
  vinh_long: "V\u0129nh Long",
  dong_thap: "\u0110\u1ED3ng Th\xE1p",
  an_giang: "An Giang",
  ca_mau: "C\xE0 Mau"
};
function formatTinhThanh(raw) {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (TINH_THANH_LABEL[key]) return TINH_THANH_LABEL[key];
  return key.split("_").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
var PLATFORM_META = {
  behance: { label: "Behance", ico: "Be" },
  instagram: { label: "Instagram", ico: "Ig" },
  facebook: { label: "Facebook", ico: "Fb" },
  youtube: { label: "YouTube", ico: "Yt" },
  twitter: { label: "X", ico: "X" },
  x: { label: "X", ico: "X" },
  linkedin: { label: "LinkedIn", ico: "Li" },
  tiktok: { label: "TikTok", ico: "Tk" },
  artstation: { label: "ArtStation", ico: "As" },
  dribbble: { label: "Dribbble", ico: "Dr" },
  pinterest: { label: "Pinterest", ico: "Pi" },
  github: { label: "GitHub", ico: "Gh" },
  website: { label: "Website", ico: "\u{1F517}" }
};
function platformFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    for (const key of Object.keys(PLATFORM_META)) {
      if (host.includes(key)) return PLATFORM_META[key];
    }
    return { label: host, ico: "\u{1F517}" };
  } catch {
    return { label: url, ico: "\u{1F517}" };
  }
}
function normalizeSocialLinks(raw) {
  if (!raw) return [];
  const out = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const obj = item;
      const url = typeof obj.url === "string" ? obj.url.trim() : "";
      if (!url) continue;
      const labelExplicit = typeof obj.label === "string" ? obj.label : "";
      const platform = platformFromUrl(url);
      out.push({
        label: labelExplicit || platform.label,
        url,
        ico: typeof obj.icon === "string" ? obj.icon : platform.ico
      });
    }
    return out;
  }
  if (typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      const url = typeof value === "string" ? value.trim() : "";
      if (!url) continue;
      const meta = PLATFORM_META[key.toLowerCase()] || platformFromUrl(url);
      out.push({ label: meta.label, url, ico: meta.ico });
    }
  }
  return out;
}
function getAvatarUrl(avatarId) {
  const local = getDefaultAvatarUrl(avatarId);
  if (local) return local;
  return getCoverUrl(avatarId, "avatar");
}
function getProfileCoverUrl(coverId) {
  return getCoverUrl(coverId, "public");
}
function getNameInitials(tenHienThi, slug) {
  const src = (tenHienThi || slug || "C").trim();
  const words = src.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "C";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}
var GIAI_DOAN_LABEL = {
  moi_bat_dau: "M\u1EDBi b\u1EAFt \u0111\u1EA7u",
  dang_hoc: "\u0110ang h\u1ECDc",
  dang_lam: "\u0110ang l\xE0m",
  tim_viec: "\u0110ang t\xECm vi\u1EC7c",
  freelance: "Freelance",
  dang_day: "Gi\xE1o vi\xEAn"
};
function getGiaiDoanLabel(g) {
  return g ? GIAI_DOAN_LABEL[g] : "\u0110ang kh\u1EDFi t\u1EA1o h\u1ED3 s\u01A1";
}
export {
  formatTinhThanh,
  getAvatarUrl,
  getGiaiDoanLabel,
  getNameInitials,
  getProfileCoverUrl,
  normalizeSocialLinks
};
