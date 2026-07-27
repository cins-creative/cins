#!/usr/bin/env node
/**
 * CLI Autopilot CINs — Giai đoạn 1–3.
 *
 * Usage:
 *   npm run autopilot -- trang-thai
 *   npm run autopilot -- dong-bo-nick
 *   npm run autopilot -- liet-ke nguon|nick|muc|ban-thao
 *   npm run autopilot -- them-nguon --nen-tang artstation --url https://…
 *   npm run autopilot -- quet-nguon [--nen-tang artstation] [--gioi-han 30] [--chi-xem]
 *   npm run autopilot -- nhap-muc --url https://… [--tieu-de] [--tac-gia] [--nen-tang]
 *   npm run autopilot -- chuan-bi-dang [--gioi-han 30] [--chi-xem] [--slug nick] [--khong-ai] [--san-sang]
 *   npm run autopilot -- duyet-ban-thao [--gioi-han 20] [--slug nick] [--tat-ca] [--chi-xem]
 *   npm run autopilot -- chay-dang [--gioi-han 30] [--chi-xem] [--slug nick]
 *   npm run autopilot -- tao-viec --loai quet_nguon
 */

import { taoClientAutopilot } from "./lib/db.mjs";
import { chayDang } from "./lenh/chay-dang.mjs";
import { chayChuanBiDang } from "./lenh/chuan-bi-dang.mjs";
import { chayDongBoNick } from "./lenh/dong-bo-nick.mjs";
import { chayDuyetBanThao } from "./lenh/duyet-ban-thao.mjs";
import { chayLietKe } from "./lenh/liet-ke.mjs";
import { chayNhapMuc } from "./lenh/nhap-muc.mjs";
import { chayQuetNguon } from "./lenh/quet-nguon.mjs";
import { chayTaoViec } from "./lenh/tao-viec.mjs";
import { chayThemNguon } from "./lenh/them-nguon.mjs";
import { chayTrangThai } from "./lenh/trang-thai.mjs";

function inHuongDan() {
  console.log(`Autopilot CLI (Giai đoạn 1–3)

Lệnh:
  trang-thai                         Đếm bảng + nick + env
  dong-bo-nick                       Upsert 10 nick seeding → auto_tai_khoan
  liet-ke <nguon|nick|muc|ban-thao>  Liệt kê
  them-nguon --nen-tang <t> --url <u> [--ma-ngoai] [--ten] [--niche]
  quet-nguon [--nen-tang artstation|behance] [--id UUID] [--gioi-han N] [--chi-xem]
  nhap-muc --url <u> [--nen-tang] [--tieu-de] [--tac-gia] [--mo-ta] [--anh-bia]
  chuan-bi-dang [--gioi-han N] [--chi-xem] [--slug nick] [--khong-ai] [--san-sang]
  duyet-ban-thao [--gioi-han N] [--slug nick] [--tat-ca] [--id UUID] [--chi-xem]
  chay-dang [--gioi-han N] [--chi-xem] [--slug nick]
  tao-viec --loai <loai> [--payload JSON]

ArtStation: RSS qua fetch-worker (quet-nguon).
Behance: Chrome extension extensions/cins-behance-import → POST /api/noi-bo/auto/muc

Luồng đăng (duyệt tay mặc định):
  chuan-bi-dang   → AI caption → auto_ban_thao cho_duyet
  duyet-ban-thao  → cho_duyet → san_sang
  chay-dang       → POST API (cover từ anh_bia_url) + hạn mức/ngày VN
  --san-sang trên chuan-bi-dang = bỏ bước duyệt (không khuyến nghị)

Migration:
  npm run migrate:autopilot
`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function camelFlags(flags) {
  const out = {};
  for (const [k, v] of Object.entries(flags)) {
    const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const lenh = positional[0];
  if (!lenh || lenh === "help" || flags.help) {
    inHuongDan();
    process.exit(0);
  }

  const db = taoClientAutopilot();
  const f = camelFlags(flags);

  switch (lenh) {
    case "trang-thai":
      await chayTrangThai(db);
      break;
    case "dong-bo-nick":
      await chayDongBoNick(db);
      break;
    case "liet-ke":
      await chayLietKe(db, positional[1]);
      break;
    case "them-nguon":
      await chayThemNguon(db, f);
      break;
    case "quet-nguon":
      await chayQuetNguon(db, f);
      break;
    case "nhap-muc":
      await chayNhapMuc(db, f);
      break;
    case "chuan-bi-dang":
      await chayChuanBiDang(db, f);
      break;
    case "duyet-ban-thao":
      await chayDuyetBanThao(db, f);
      break;
    case "chay-dang":
      await chayDang(db, f);
      break;
    case "tao-viec":
      await chayTaoViec(db, f);
      break;
    default:
      console.error(`Không biết lệnh: ${lenh}`);
      inHuongDan();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Lỗi:", err?.message ?? err);
  process.exit(1);
});
