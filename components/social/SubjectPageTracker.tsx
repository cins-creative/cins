"use client";

import { useEffect } from "react";

import type {
  LoaiDoiTuongSuKien,
  NguonSuKien,
} from "@/lib/social/su-kien-constants";
import { isUuid } from "@/lib/social/su-kien-constants";
import { trackImpression } from "@/lib/social/track-su-kien";

type Props = {
  loai: LoaiDoiTuongSuKien;
  id: string;
  nguon?: NguonSuKien;
  enabled?: boolean;
};

/** Một lần `hien_thi` khi mở trang subject (hồ sơ, sự kiện, bài viết…). */
export function SubjectPageTracker({
  loai,
  id,
  nguon = "permalink",
  enabled = true,
}: Props) {
  useEffect(() => {
    if (!enabled || !isUuid(id)) return;
    trackImpression({ loaiDoiTuong: loai, idDoiTuong: id, nguon });
  }, [loai, id, nguon, enabled]);
  return null;
}
