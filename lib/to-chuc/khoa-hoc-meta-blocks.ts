import type { Block } from "@/lib/editor/types";
import { parseGoiHocPhiMeta } from "@/lib/to-chuc/khoa-hoc-goi-phi";
import type {
  GoiHocPhiKhoa,
  KhoaHocCheDoHienThi,
} from "@/lib/to-chuc/khoa-hoc-types";

const YEU_CAU_HEADING = "Yêu cầu chuẩn bị";
const DIA_DIEM_HEADING = "Địa điểm học";
const META_PREFIX = "<!--cins-khoa-meta-->";

function newBlockId(): string {
  return `khb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function bodyBlock(thuTu: number, html: string): Block {
  return {
    id: newBlockId(),
    loai: "body",
    thu_tu: thuTu,
    config: { html },
  };
}

function headingBlock(thuTu: number, html: string): Block {
  return {
    id: newBlockId(),
    loai: "h3",
    thu_tu: thuTu,
    config: { html },
  };
}

function metaBlock(
  cheDoHienThi: KhoaHocCheDoHienThi,
  goiHocPhi?: GoiHocPhiKhoa[],
): Block {
  const payload: {
    cheDoHienThi: KhoaHocCheDoHienThi;
    goiHocPhi?: GoiHocPhiKhoa[];
  } = { cheDoHienThi };
  if (goiHocPhi?.length) payload.goiHocPhi = goiHocPhi;
  return {
    id: newBlockId(),
    loai: "body",
    thu_tu: -9999,
    config: { html: `${META_PREFIX}${JSON.stringify(payload)}` },
  };
}

function parseMetaFromBlocks(blocks: unknown): {
  cheDoHienThi: KhoaHocCheDoHienThi;
  goiHocPhi: GoiHocPhiKhoa[];
} {
  if (!Array.isArray(blocks)) {
    return { cheDoHienThi: "cong_khai", goiHocPhi: [] };
  }
  for (const raw of blocks) {
    const block = raw as Block;
    if (block.loai !== "body") continue;
    const html = block.config?.html;
    if (typeof html !== "string" || !html.startsWith(META_PREFIX)) continue;
    try {
      const parsed = JSON.parse(html.slice(META_PREFIX.length)) as {
        cheDoHienThi?: unknown;
        goiHocPhi?: unknown;
      };
      const cheDoHienThi = parsed.cheDoHienThi === "an" ? "an" : "cong_khai";
      return {
        cheDoHienThi,
        goiHocPhi: parseGoiHocPhiMeta(parsed.goiHocPhi),
      };
    } catch {
      /* ignore malformed meta */
    }
  }
  return { cheDoHienThi: "cong_khai", goiHocPhi: [] };
}

/** Ghi meta + yêu cầu chuẩn bị + địa điểm (offline) vào `org_khoa_hoc.noi_dung_blocks`. */
export function buildKhoaHocNoiDungBlocks(opts: {
  yeuCauChuanBi?: string | null;
  diaChiHoc?: string | null;
  includeDiaDiem?: boolean;
  cheDoHienThi?: KhoaHocCheDoHienThi;
  goiHocPhi?: GoiHocPhiKhoa[];
}): Block[] {
  const blocks: Block[] = [
    metaBlock(
      opts.cheDoHienThi === "an" ? "an" : "cong_khai",
      opts.goiHocPhi,
    ),
  ];
  let thuTu = 0;
  const yeuCau = opts.yeuCauChuanBi?.trim();
  if (yeuCau) {
    blocks.push(headingBlock(thuTu++, YEU_CAU_HEADING));
    blocks.push(bodyBlock(thuTu++, yeuCau));
  }
  const diaChi = opts.diaChiHoc?.trim();
  if (opts.includeDiaDiem && diaChi) {
    blocks.push(headingBlock(thuTu++, DIA_DIEM_HEADING));
    blocks.push(bodyBlock(thuTu++, diaChi));
  }
  return blocks;
}

function htmlFromBlock(block: Block): string {
  const html = block.config?.html;
  return typeof html === "string" ? html.trim() : "";
}

/** Đọc các section marketing + meta đã lưu từ blocks. */
export function parseKhoaHocNoiDungBlocks(blocks: unknown): {
  yeuCauChuanBi: string | null;
  diaChiHoc: string | null;
  cheDoHienThi: KhoaHocCheDoHienThi;
  goiHocPhi: GoiHocPhiKhoa[];
} {
  const meta = parseMetaFromBlocks(blocks);
  if (!Array.isArray(blocks)) {
    return {
      yeuCauChuanBi: null,
      diaChiHoc: null,
      cheDoHienThi: meta.cheDoHienThi,
      goiHocPhi: meta.goiHocPhi,
    };
  }
  let yeuCauChuanBi: string | null = null;
  let diaChiHoc: string | null = null;
  const sorted = [...blocks].sort(
    (a, b) =>
      Number((a as Block).thu_tu ?? 0) - Number((b as Block).thu_tu ?? 0),
  );
  for (let i = 0; i < sorted.length; i += 1) {
    const block = sorted[i] as Block;
    if (block.loai !== "h3") continue;
    const heading = htmlFromBlock(block);
    const next = sorted[i + 1] as Block | undefined;
    if (next?.loai !== "body") continue;
    const body = htmlFromBlock(next);
    if (!body) continue;
    if (heading === YEU_CAU_HEADING) yeuCauChuanBi = body;
    if (heading === DIA_DIEM_HEADING) diaChiHoc = body;
  }
  return {
    yeuCauChuanBi,
    diaChiHoc,
    cheDoHienThi: meta.cheDoHienThi,
    goiHocPhi: meta.goiHocPhi,
  };
}
