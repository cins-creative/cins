/**
 * Thống kê media rơi rụng khi kéo project từ Behance / ArtStation / Carrd.
 * Dùng chung server (dựng preview) và client (modal xác nhận) — không `server-only`.
 */

import { MAX_CLOUDFLARE_IMAGE_UPLOAD_MB } from "@/lib/cloudflare/image-upload-limits";

export type PortImportBoQua = {
  /** Ảnh phát hiện trên trang nguồn, trước mọi giới hạn. */
  tongAnhNguon: number;
  /** Ảnh thực sự vào bài. */
  daLay: number;
  /** Rơi vì vượt trần dung lượng Cloudflare Images — thường là GIF động quá lớn / không nén nổi. */
  quaLon: number;
  /** Ảnh đã nén xuống dưới trần rồi upload thành công. */
  daNen: number;
  /** Rơi vì vượt trần số ảnh mỗi project. */
  vuotTran: number;
  /** Rơi vì tải nguồn lỗi hoặc upload thất bại. */
  loi: number;
};

export function taoBoQuaRong(tongAnhNguon = 0, daLay = 0): PortImportBoQua {
  return {
    tongAnhNguon,
    daLay,
    quaLon: 0,
    daNen: 0,
    vuotTran: 0,
    loi: 0,
  };
}

export function tongSoAnhBoQua(boQua: PortImportBoQua | null | undefined): number {
  if (!boQua) return 0;
  return boQua.quaLon + boQua.vuotTran + boQua.loi;
}

/** Từng dòng lý do — modal render thành danh sách. */
export function lyDoBoQua(boQua: PortImportBoQua): string[] {
  const dong: string[] = [];
  if (boQua.daNen > 0) {
    dong.push(
      `${boQua.daNen} ảnh đã được nén xuống dưới ${MAX_CLOUDFLARE_IMAGE_UPLOAD_MB} MB trước khi lưu.`,
    );
  }
  if (boQua.quaLon > 0) {
    dong.push(
      `${boQua.quaLon} ảnh không nén nổi dưới ${MAX_CLOUDFLARE_IMAGE_UPLOAD_MB} MB — thường là GIF động rất nặng.`,
    );
  }
  if (boQua.vuotTran > 0) {
    dong.push(`${boQua.vuotTran} ảnh vượt giới hạn số ảnh mỗi project.`);
  }
  if (boQua.loi > 0) {
    dong.push(`${boQua.loi} ảnh tải về hoặc lưu trữ thất bại.`);
  }
  return dong;
}
