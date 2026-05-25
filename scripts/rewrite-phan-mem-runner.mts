import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

type Meta = Record<string, unknown>;

type ArticleJob = {
  id: string;
  slug: string;
  tieu_de_viet: string;
  tom_tat: string;
  meta_title: string;
  meta_description: string;
  meta: Meta;
  htmlFile: string;
};

const JOBS: ArticleJob[] = [
  {
    id: "838dc72d-d4a5-46a9-b2ea-e95dcfd8d98d",
    slug: "3dequalizer",
    tieu_de_viet: "3DEqualizer — Camera tracking &amp; matchmove VFX",
    tom_tat:
      "Phần mềm matchmove và camera tracking 3D chuyên nghiệp — gắn CG khớp footage thật trong pipeline VFX điện ảnh và quảng cáo.",
    meta_title:
      "3DEqualizer là gì? Matchmove, giá và hướng dẫn học | CINS",
    meta_description:
      "3DEqualizer: camera tracking VFX, lens distortion, object track, xuất sang Maya/Nuke. So sánh SynthEyes, PFTrack và lộ trình học.",
    meta: {
      nha_phat_hanh: "Science-D-Visions",
      version: "2024",
      platform: ["Windows", "Linux"],
      website: "https://www.3dequalizer.com",
      goi_mien_phi: "Bản demo giới hạn",
      gia_thanh: "Liên hệ bản quyền studio",
      hinh_thuc_mua: "Mua một lần · bản quyền studio",
      link_tai: "https://www.3dequalizer.com",
    },
    htmlFile: "3dequalizer.html",
  },
  {
    id: "aae48218-824b-42c5-b1e9-2ce1a8cae6fc",
    slug: "3ds-max",
    tieu_de_viet: "3ds Max — Mô hình 3D &amp; dựng hình kiến trúc",
    tom_tat:
      "Phần mềm 3D của Autodesk cho modeling, hoạt hình, dựng hình và visualization — phổ biến trong kiến trúc, nội thất và game.",
    meta_title: "3ds Max là gì? Tính năng, giá và hướng dẫn học | CINS",
    meta_description:
      "3ds Max (Autodesk): modeling 3D, V-Ray/Corona render, archviz. So sánh Blender, Maya và lộ trình học cho người mới.",
    meta: {
      nha_phat_hanh: "Autodesk",
      version: "2025",
      platform: ["Windows"],
      website: "https://www.autodesk.com/products/3ds-max",
      goi_mien_phi: "Dùng thử 30 ngày",
      gia_thanh: "Thuê bao Autodesk (~280 USD/tháng hoặc gói năm)",
      hinh_thuc_mua: "Thuê bao tháng · Autodesk",
      link_tai: "https://www.autodesk.com/products/3ds-max/free-trial",
    },
    htmlFile: "3ds-max.html",
  },
  {
    id: "76bf32d2-b6bd-4733-87e1-944699ece7fe",
    slug: "ableton-live",
    tieu_de_viet: "Ableton Live — Sản xuất &amp; biểu diễn nhạc điện tử",
    tom_tat:
      "DAW cho sáng tác, ghi âm và biểu diễn trực tiếp — nổi tiếng với Session View và luồng làm việc nhạc điện tử.",
    meta_title: "Ableton Live là gì? Tính năng, giá và hướng dẫn học | CINS",
    meta_description:
      "Ableton Live: Session View, sản xuất EDM, biểu diễn live. So sánh FL Studio và lộ trình học cho người mới.",
    meta: {
      nha_phat_hanh: "Ableton",
      version: "12",
      platform: ["Windows", "macOS"],
      website: "https://www.ableton.com",
      goi_mien_phi: "Dùng thử 90 ngày",
      gia_thanh: "Từ 99 EUR (Intro) · 279 EUR (Suite)",
      hinh_thuc_mua: "Mua một lần · Intro/Standard/Suite",
      link_tai: "https://www.ableton.com/trial",
    },
    htmlFile: "ableton-live.html",
  },
  {
    id: "03a18e77-12c7-4487-84c5-b62ee1068071",
    slug: "adobe-animate",
    tieu_de_viet: "Adobe Animate — Hoạt hình 2D &amp; nội dung tương tác",
    tom_tat:
      "Hoạt hình 2D vector và nội dung tương tác của Adobe — banner web, e-learning, game 2D nhẹ và motion cho social.",
    meta_title: "Adobe Animate là gì? Tính năng, giá và hướng dẫn học | CINS",
    meta_description:
      "Adobe Animate: hoạt hình 2D vector, HTML5 Canvas, bone rig. So sánh Toon Boom Harmony và lộ trình học.",
    meta: {
      nha_phat_hanh: "Adobe",
      version: "2024",
      platform: ["Windows", "macOS"],
      website: "https://www.adobe.com/products/animate.html",
      goi_mien_phi: "Dùng thử 7 ngày",
      gia_thanh: "Từ ~22 USD/tháng (Creative Cloud)",
      hinh_thuc_mua: "Thuê bao tháng · Creative Cloud",
      link_tai: "https://www.adobe.com/products/animate.html",
    },
    htmlFile: "adobe-animate.html",
  },
  {
    id: "d916aa15-69aa-45d3-a543-315002c09839",
    slug: "adobe-audition",
    tieu_de_viet: "Adobe Audition — Chỉnh sửa &amp; mix âm thanh",
    tom_tat:
      "Chỉnh sửa và mix âm thanh chuyên nghiệp — podcast, lồng tiếng video, làm sạch noise cho sản xuất đa phương tiện.",
    meta_title: "Adobe Audition là gì? Tính năng, giá và hướng dẫn học | CINS",
    meta_description:
      "Adobe Audition: multitrack, noise reduction, podcast. So sánh Reaper, Pro Tools và lộ trình học cho người mới.",
    meta: {
      nha_phat_hanh: "Adobe",
      version: "2024",
      platform: ["Windows", "macOS"],
      website: "https://www.adobe.com/products/audition.html",
      goi_mien_phi: "Dùng thử 7 ngày",
      gia_thanh: "Từ ~22 USD/tháng (Creative Cloud)",
      hinh_thuc_mua: "Thuê bao tháng · Creative Cloud",
      link_tai: "https://www.adobe.com/products/audition.html",
    },
    htmlFile: "adobe-audition.html",
  },
];

const dir = join(import.meta.dirname, "phan-mem-content");
const only = process.argv[2]?.trim();

for (const job of JOBS) {
  if (only && job.slug !== only && job.htmlFile !== only) continue;

  const path = join(dir, job.htmlFile);
  let html: string;
  try {
    html = readFileSync(path, "utf8")
      .trim()
      .replace(/<\/?motion\b/g, (m) => m.replace("motion", "div"));
  } catch {
    console.log(`⏭ Bỏ qua ${job.slug} — chưa có ${job.htmlFile}`);
    continue;
  }

  if (html.length < 8000) {
    console.warn(`⚠ ${job.slug} chỉ ${html.length} ký tự — có thể còn ngắn`);
  }

  const metaJson = JSON.stringify(job.meta);
  const sql = `
UPDATE article_bai_viet SET
  tieu_de_viet = '${job.tieu_de_viet.replace(/'/g, "''")}',
  tom_tat = '${job.tom_tat.replace(/'/g, "''")}',
  meta = $meta$${metaJson}$meta$::jsonb,
  meta_title = '${job.meta_title.replace(/'/g, "''")}',
  meta_description = '${job.meta_description.replace(/'/g, "''")}',
  trang_thai_noi_dung = 'published',
  cap_nhat_luc = now(),
  noi_dung = $noidung$${html}$noidung$
WHERE id = '${job.id}' AND loai_bai_viet = 'phan_mem';

SELECT slug, tieu_de, LENGTH(noi_dung) AS do_dai FROM article_bai_viet WHERE id = '${job.id}';
`;

  const res = await runAdminSql(sql, "full");
  const row = res.rows?.find(
    (r) => r && typeof r === "object" && "do_dai" in r,
  ) as { do_dai?: string; tieu_de?: string } | undefined;
  const len = row?.do_dai ? Number(row.do_dai) : html.length;
  console.log(`✓ ${job.tieu_de_viet.replace(/&amp;/g, "&")} — ${len} ký tự`);
}

if (!only) {
  const missing = JOBS.filter((j) => {
    try {
      readFileSync(join(dir, j.htmlFile), "utf8");
      return false;
    } catch {
      return true;
    }
  }).map((j) => j.htmlFile);
  if (missing.length) {
    console.log("\nChưa viết:", missing.join(", "));
  }
}
