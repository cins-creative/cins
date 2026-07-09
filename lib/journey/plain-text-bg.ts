import type { Block } from "@/lib/editor/types";

/** Nền card «chỉ chữ» — lưu trong `config.chiChuNen` của block `body` đầu tiên. */
export const CHI_CHU_NEN_COUNT = 6;

export const CHI_CHU_NEN_IDS = [0, 1, 2, 3, 4, 5] as const;

export type ChiChuNenId = (typeof CHI_CHU_NEN_IDS)[number];

export const CHI_CHU_NEN_LABELS: Record<ChiChuNenId, string> = {
  0: "Xanh CINs",
  1: "Mint",
  2: "Tím",
  3: "Cam",
  4: "Vàng",
  5: "Xanh đậm",
};

const LEGACY_CONFIG_KEY = "textPanelTone";

export function isChiChuNenId(value: unknown): value is ChiChuNenId {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < CHI_CHU_NEN_COUNT
  );
}

export function defaultChiChuNen(seed: string): ChiChuNenId {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % CHI_CHU_NEN_COUNT) as ChiChuNenId;
}

function readChiChuNenFromBlock(block: Block): ChiChuNenId | null {
  const tone = block.config?.chiChuNen ?? block.config?.[LEGACY_CONFIG_KEY];
  return isChiChuNenId(tone) ? tone : null;
}

export function readChiChuNenFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): ChiChuNenId | null {
  if (!blocks?.length) return null;
  for (const block of blocks) {
    if (block.loai !== "body") continue;
    return readChiChuNenFromBlock(block);
  }
  return null;
}

export function resolveChiChuNen(
  blocks: ReadonlyArray<Block> | null | undefined,
  seed: string,
): ChiChuNenId {
  return readChiChuNenFromBlocks(blocks) ?? defaultChiChuNen(seed);
}

export function chiChuNenClass(nen: ChiChuNenId): string {
  return `jcard-chi-chu--nen-${nen}`;
}

export function chiChuUsesLightInk(nen: ChiChuNenId): boolean {
  return nen === 4;
}

/** Tách đoạn card chỉ chữ (blank line giữa các đoạn). */
export function splitChiChuParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const CHI_CHU_RESTORE_MIN_BREAKS = 3;
const CHI_CHU_RESTORE_BREAKS_PER_CHAR = 250;

/** Plain text dính liền (paste Word/PDF, `mo_ta` không có `\n`) — khôi phục xuống dòng hiển thị. */
export function restoreChiChuPlainLineBreaks(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n");
  const existingBreaks = (normalized.match(/\n/g) ?? []).length;
  if (
    existingBreaks >= CHI_CHU_RESTORE_MIN_BREAKS ||
    existingBreaks >= normalized.length / CHI_CHU_RESTORE_BREAKS_PER_CHAR
  ) {
    return normalized;
  }

  let out = normalized;

  out = out.replace(/(?<=\S)(?=CHƯƠNG \d+:)/g, "\n\n");
  out = out.replace(/(?<=\S)(?=BỘ GIÁO DỤC)/g, "\n\n");
  out = out.replace(/(?<=\S)(?=TRƯỜNG )/g, "\n\n");
  out = out.replace(/(?<=\S)(?=KHOA )/g, "\n\n");
  out = out.replace(/(?<=\S)(?=BÁO CÁO )/g, "\n\n");
  out = out.replace(/(?<=\S)(?=CHUYÊN NGÀNH:)/g, "\n\n");
  out = out.replace(/(?<=\S)(?=\d+\.\d+\.\d+\.)/g, "\n\n");
  out = out.replace(/(?<=\S)(?=\d+\.\d+\.)/g, "\n\n");
  out = out.replace(/(?<=\S)(?=\[Chèn ảnh:)/g, "\n\n");

  const lineLabels = [
    "Vị trí thực tập:",
    "Sinh viên thực hiện:",
    "Mã số sinh viên:",
    "Giảng viên hướng dẫn:",
    "Khóa học:",
    "Lĩnh vực hoạt động:",
    "Mục tiêu hoạt động:",
    "Vị trí đảm nhận:",
    "Nhiệm vụ chính:",
    "Mô tả công việc:",
    "Mô tả sản phẩm:",
    "Yêu cầu:",
    "Giải pháp kỹ thuật:",
    "Giải pháp bố cục",
    "Giải pháp Motion",
    "Sản phẩm 1:",
    "Sản phẩm 2:",
    "Sản phẩm:",
    "Chi tiết giải pháp",
    "Hình ảnh minh họa",
    "Cấu trúc cây thư mục",
    "Về kỹ năng chuyên môn:",
    "Về kỹ năng mềm:",
    "Giai đoạn đầu",
    "Tiếp tục đầu tư",
  ];
  for (const label of lineLabels) {
    out = out.replace(
      new RegExp(`(?<=\\S)(?=${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "g"),
      "\n",
    );
  }

  /* Dòng tiêu đề IN HOA → nhãn Title case (vd. `HỌAVị trí`). */
  out = out.replace(/(?<=[A-ZÀ-Ỹ]{2,})(?=Vị trí )/g, "\n");
  /* Câu mới sau dấu chấm (tránh `TP.HCM`). */
  out = out.replace(/\.(?=[A-ZÀ-ỸĐ][a-zà-ỹđ])/g, ".\n");

  return out.replace(/\n{3,}/g, "\n\n").trim();
}

const CHI_CHU_COLLAPSE_CHARS = 260;
const CHI_CHU_COLLAPSE_PARAS = 3;

/** Nội dung dài — mặc định thu gọn, bấm «Xem đầy đủ» mới xổ hết. */
export function chiChuNeedsCollapse(
  text: string,
  paragraphCount: number,
): boolean {
  if (paragraphCount >= CHI_CHU_COLLAPSE_PARAS) return true;
  return text.length > CHI_CHU_COLLAPSE_CHARS;
}

const CHI_CHU_TEXT_BLOCK_LOAI = new Set<Block["loai"]>([
  "body",
  "h2",
  "h3",
  "quote",
]);

function chiChuBlockHasText(block: Block): boolean {
  if (!CHI_CHU_TEXT_BLOCK_LOAI.has(block.loai)) return false;
  const html = block.config?.html;
  return typeof html === "string" && html.trim().length > 0;
}

/** Nội dung seed khi phải tạo block `body` mới — tránh trùng nếu chữ đã nằm ở h2/h3/quote. */
function seedBodyHtmlForChiChuNen(
  blocks: ReadonlyArray<Block>,
  moTa: string | null | undefined,
): string | null {
  const trimmedMoTa = moTa?.trim() || null;
  if (trimmedMoTa) return trimmedMoTa.replace(/\r\n/g, "\n");

  const hasOtherTextBlocks = blocks.some(
    (block) =>
      block.loai !== "body" &&
      CHI_CHU_TEXT_BLOCK_LOAI.has(block.loai) &&
      chiChuBlockHasText(block),
  );
  if (hasOtherTextBlocks) return "";

  for (const block of blocks) {
    if (!chiChuBlockHasText(block)) continue;
    const html = block.config?.html;
    if (typeof html === "string" && html.trim()) {
      return html.trim();
    }
  }
  return null;
}

function chiChuPostHasTextContent(
  blocks: ReadonlyArray<Block>,
  moTa: string | null | undefined,
): boolean {
  if (moTa?.trim()) return true;
  return blocks.some(chiChuBlockHasText);
}

export type ApplyChiChuNenOptions = {
  moTa?: string | null;
  tacPhamId?: string;
};

export function applyChiChuNenToBlocks(
  blocks: ReadonlyArray<Block>,
  nen: ChiChuNenId,
  options?: ApplyChiChuNenOptions,
): Block[] | null {
  let touched = false;
  const next = blocks.map((block) => {
    if (block.loai !== "body" || touched) return block;
    touched = true;
    const config = { ...(block.config ?? {}) };
    config.chiChuNen = nen;
    delete config[LEGACY_CONFIG_KEY];
    return {
      ...block,
      config,
    };
  });
  if (touched) return next;

  if (!chiChuPostHasTextContent(blocks, options?.moTa)) return null;

  const html = seedBodyHtmlForChiChuNen(blocks, options?.moTa);
  if (html === null) return null;

  const seed = options?.tacPhamId?.trim() || "chi-chu";
  const minThuTu = blocks.reduce(
    (min, block) => Math.min(min, block.thu_tu),
    0,
  );
  const bodyBlock: Block = {
    id: `b-chi-chu-nen-${seed.slice(0, 8)}`,
    loai: "body",
    thu_tu: minThuTu - 1,
    config: {
      html,
      chiChuNen: nen,
    },
  };

  return [...blocks, bodyBlock].sort((a, b) => a.thu_tu - b.thu_tu);
}
