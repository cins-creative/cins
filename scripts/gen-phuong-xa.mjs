/**
 * Sinh dữ liệu phường/xã VN sau sát nhập (hiệu lực 1/7/2025, 34 tỉnh · 3.321
 * đơn vị cấp xã) từ dataset mở CC-BY-4.0:
 *   open-admin-data/vietnam-administrative-divisions
 *
 * Kết quả: lib/vn/phuong-xa-2025.ts — nhóm theo mã enum tỉnh của CINs
 *   Record<string, { code, name }[]> (bundled, chạy được trên Cloudflare
 *   Workers; annotation tường minh để tsc không phải suy luận literal khổng lồ).
 *
 * Usage: node scripts/gen-phuong-xa.mjs
 * Chạy lại khi có nghị định điều chỉnh địa giới.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../lib/vn/phuong-xa-2025.ts");
const BASE =
  "https://raw.githubusercontent.com/open-admin-data/vietnam-administrative-divisions/main/data";

/** Mã enum tỉnh hợp lệ của CINs (khớp lib/truong/contact.ts). */
const TINH_CODES = new Set([
  "hcm", "ha_noi", "da_nang", "an_giang", "bac_ninh", "ca_mau", "can_tho",
  "cao_bang", "dak_lak", "dien_bien", "dong_nai", "dong_thap", "gia_lai",
  "ha_tinh", "hai_phong", "hung_yen", "hue", "khanh_hoa", "lai_chau",
  "lam_dong", "lang_son", "lao_cai", "nghe_an", "ninh_binh", "phu_tho",
  "quang_ngai", "quang_ninh", "quang_tri", "son_la", "tay_ninh",
  "thai_nguyen", "thanh_hoa", "tuyen_quang", "vinh_long",
]);

/** Bỏ dấu tiếng Việt + đ→d, trả về slug gạch dưới. */
function toSlug(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Tên tỉnh (name.local) → mã enum CINs. */
function provinceNameToCode(nameLocal) {
  const slug = toSlug(nameLocal);
  if (slug === "ho_chi_minh") return "hcm";
  return TINH_CODES.has(slug) ? slug : null;
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

function pickName(node) {
  return (node?.name?.local ?? node?.name ?? "").toString().trim();
}
function pickCode(node) {
  return (node?.code?.id ?? node?.id ?? "").toString().trim();
}
function pickParent(node) {
  if (typeof node?.parent === "string") return node.parent;
  if (node?.parent?.id) return String(node.parent.id);
  if (Array.isArray(node?.ancestors) && node.ancestors.length > 0) {
    const a = node.ancestors[0];
    return typeof a === "string" ? a : String(a?.id ?? "");
  }
  return "";
}

async function main() {
  console.log("Đang tải provinces + wards…");
  const [provinces, wards] = await Promise.all([
    getJson(`${BASE}/all-province.json`),
    getJson(`${BASE}/all-ward.json`),
  ]);

  /* provinceId (GSO) → mã enum CINs. */
  const idToCode = new Map();
  for (const p of provinces) {
    const code = provinceNameToCode(pickName(p));
    if (!code) {
      throw new Error(`Không map được tỉnh: ${pickName(p)} (id=${p.id})`);
    }
    idToCode.set(String(p.id), code);
  }
  if (idToCode.size !== 34) {
    throw new Error(`Kỳ vọng 34 tỉnh, nhận ${idToCode.size}`);
  }

  /** @type {Record<string, {code:string,name:string}[]>} */
  const grouped = {};
  for (const code of TINH_CODES) grouped[code] = [];

  let total = 0;
  let unmatched = 0;
  for (const w of wards) {
    const parentId = pickParent(w);
    const code = idToCode.get(parentId);
    if (!code) {
      unmatched += 1;
      continue;
    }
    const name = pickName(w);
    if (!name) continue;
    grouped[code].push({ code: pickCode(w), name });
    total += 1;
  }

  for (const code of Object.keys(grouped)) {
    grouped[code].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }

  const header =
    "/* eslint-disable */\n// prettier-ignore-start\n" +
    "// AUTO-GENERATED bởi scripts/gen-phuong-xa.mjs — KHÔNG sửa tay.\n" +
    "// Nguồn: open-admin-data/vietnam-administrative-divisions (CC-BY-4.0).\n" +
    "// 34 tỉnh · 3.321 phường/xã sau sát nhập (hiệu lực 1/7/2025).\n\n" +
    "export type PhuongXaEntry = { code: string; name: string };\n\n" +
    "const PHUONG_XA_2025: Record<string, PhuongXaEntry[]> = ";
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    header + JSON.stringify(grouped) + ";\n\nexport default PHUONG_XA_2025;\n",
    "utf8",
  );

  const counts = Object.entries(grouped)
    .map(([k, v]) => `${k}=${v.length}`)
    .join(" ");
  console.log(`OK: ${total} phường/xã, ${unmatched} không map được.`);
  console.log(counts);
  console.log(`→ ${path.relative(process.cwd(), OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
