#!/usr/bin/env node
/**
 * CLI Autopilot CINs — Giai đoạn 1–2.
 *
 * Usage:
 *   npm run autopilot -- trang-thai
 *   npm run autopilot -- dong-bo-nick
 *   npm run autopilot -- liet-ke nguon|nick|muc
 *   npm run autopilot -- them-nguon --nen-tang artstation --url https://…
 *   npm run autopilot -- quet-nguon [--nen-tang artstation] [--gioi-han 30] [--chi-xem]
 *   npm run autopilot -- nhap-muc --url https://… [--tieu-de] [--tac-gia] [--nen-tang]
 *   npm run autopilot -- tao-viec --loai quet_nguon
 */

import { taoClientAutopilot } from "./lib/db.mjs";
import { chayDongBoNick } from "./lenh/dong-bo-nick.mjs";
import { chayLietKe } from "./lenh/liet-ke.mjs";
import { chayNhapMuc } from "./lenh/nhap-muc.mjs";
import { chayQuetNguon } from "./lenh/quet-nguon.mjs";
import { chayTaoViec } from "./lenh/tao-viec.mjs";
import { chayThemNguon } from "./lenh/them-nguon.mjs";
import { chayTrangThai } from "./lenh/trang-thai.mjs";

function inHuongDan() {
  console.log(`Autopilot CLI (Giai đoạn 1–2)

Lệnh:
  trang-thai                         Đếm bảng + nick + env
  dong-bo-nick                       Upsert 10 nick seeding → auto_tai_khoan
  liet-ke <nguon|nick|muc>           Liệt kê
  them-nguon --nen-tang <t> --url <u> [--ma-ngoai] [--ten] [--niche]
  quet-nguon [--nen-tang artstation|behance] [--id UUID] [--gioi-han N] [--chi-xem]
  nhap-muc --url <u> [--nen-tang] [--tieu-de] [--tac-gia] [--mo-ta] [--anh-bia]
  tao-viec --loai <loai> [--payload JSON]

ArtStation: RSS https://www.artstation.com/{user}.rss qua fetch-worker.
Behance: CF đang chặn → dùng nhap-muc thủ công.

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
