import type { TruongPagePayload } from "@/lib/truong/types";

import type { CoSoDetailPayload } from "./co-so-page-queries";

/** Payload tối thiểu cho `TruongInlineEditProvider` trên trang cơ sở. */
export function coSoToInlinePayload(payload: CoSoDetailPayload): TruongPagePayload {
  return {
    school: payload.school,
    stats: {
      year: new Date().getFullYear(),
      diemChuanMax: null,
      chiTieuTong: null,
      hocPhiLabel: null,
      journeyCount: 0,
    },
    baidang: payload.baidang,
    hinhanh: payload.hinhanh,
    tuyenSinh: [],
    journeyMembers: [],
    cauHinhYears: [],
    cauHinhMonThiByKey: {},
  };
}
