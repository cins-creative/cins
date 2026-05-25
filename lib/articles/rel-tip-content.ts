import { labelLoaiQuanHe } from "@/lib/articles/quan-he-labels";
import { relLoaiKind } from "@/lib/articles/rel-visual";
import type { ArticleCard, MetaNganhDaoTao, MetaPhanMem } from "@/lib/articles/types";

export type RelTipContent = {
  kind: string;
  desc: string | null;
  meta: string[];
  metaHot?: string;
  metaOk?: string;
  metaWarn?: string;
  thumbnailSrc?: string | null;
  thumbnailAlt?: string;
};

function metaNganh(m: MetaNganhDaoTao): RelTipContent["meta"] {
  const chips: string[] = [];
  if (m.ma_nganh?.trim()) chips.push(`Mã ${m.ma_nganh.trim()}`);
  if (m.thoi_gian_dao_tao?.trim()) chips.push(m.thoi_gian_dao_tao.trim());
  if (m.khoi_thi?.length) chips.push(m.khoi_thi.join(" · "));
  return chips;
}

function metaPhanMem(m: MetaPhanMem): RelTipContent["meta"] {
  const chips: string[] = [];
  if (m.nha_phat_hanh?.trim()) chips.push(m.nha_phat_hanh.trim());
  if (m.version?.trim()) chips.push(`v${m.version.trim()}`);
  if (m.platform?.length) chips.push(m.platform.join(" · "));
  return chips;
}

/** Dòng phụ trong `.rel-name small` (giống static «7320105 · 4 năm»). */
export function relItemSubline(card: ArticleCard): string | null {
  const loai = String(card.loai_bai_viet);
  if (loai === "nganh_dao_tao" && card.meta && typeof card.meta === "object") {
    const m = card.meta as MetaNganhDaoTao;
    const parts: string[] = [];
    if (m.ma_nganh?.trim()) parts.push(m.ma_nganh.trim());
    if (m.thoi_gian_dao_tao?.trim()) parts.push(m.thoi_gian_dao_tao.trim());
    return parts.length ? parts.join(" · ") : null;
  }
  if (loai === "phan_mem" && card.meta && typeof card.meta === "object") {
    const m = card.meta as MetaPhanMem;
    const parts: string[] = [];
    if (m.nha_phat_hanh?.trim()) parts.push(m.nha_phat_hanh.trim());
    if (m.platform?.length) parts.push(m.platform.slice(0, 2).join(" · "));
    return parts.length ? parts.join(" · ") : null;
  }
  if (loai === "nghe") {
    const lv = card.linh_vuc?.ten?.trim();
    if (lv) return lv;
    return null;
  }
  return null;
}

/** Nội dung tooltip hover — đồng bộ static sidebar ngành/nghề. */
export function buildRelTipContent(card: ArticleCard): RelTipContent {
  const loai = String(card.loai_bai_viet);
  const desc = card.tom_tat?.trim() || null;
  const thumb = card.thumb_url?.trim() || null;

  if (loai === "nganh_dao_tao" && card.meta && typeof card.meta === "object") {
    const m = card.meta as MetaNganhDaoTao;
    const meta = metaNganh(m);
    return {
      kind: "Ngành · Bậc Đại học",
      desc,
      meta: meta.length ? meta : [relLoaiKind(loai)],
      thumbnailSrc: thumb,
      thumbnailAlt: card.tieu_de,
    };
  }

  if (loai === "phan_mem" && card.meta && typeof card.meta === "object") {
    const m = card.meta as MetaPhanMem;
    const meta = metaPhanMem(m);
    return {
      kind: "Phần mềm · Tool",
      desc,
      meta: meta.length ? meta : [relLoaiKind(loai)],
      thumbnailSrc: thumb,
      thumbnailAlt: card.tieu_de,
    };
  }

  if (loai === "nghe") {
    const meta: string[] = [];
    const lv = card.linh_vuc?.ten?.trim();
    if (lv) meta.push(lv);
    if (card.loai_quan_he) {
      meta.push(labelLoaiQuanHe(card.loai_quan_he));
    }
    if (meta.length === 0) meta.push(relLoaiKind(loai));
    return {
      kind: "Nghề · Vị trí công việc",
      desc,
      meta,
      metaHot: lv ?? undefined,
      thumbnailSrc: thumb,
      thumbnailAlt: card.tieu_de,
    };
  }

  if (loai === "keyword") {
    const meta: string[] = [];
    if (card.cap_do?.trim()) meta.push(card.cap_do.trim());
    if (card.loai_quan_he) meta.push(labelLoaiQuanHe(card.loai_quan_he));
    if (!meta.length) meta.push(relLoaiKind(loai));
    return {
      kind: "Keyword · Kỹ thuật",
      desc,
      meta,
      thumbnailSrc: thumb,
      thumbnailAlt: card.tieu_de,
    };
  }

  const meta: string[] = [relLoaiKind(loai)];
  if (card.loai_quan_he) meta.push(labelLoaiQuanHe(card.loai_quan_he));

  return {
    kind: relLoaiKind(loai),
    desc,
    meta,
    thumbnailSrc: thumb,
    thumbnailAlt: card.tieu_de,
  };
}
