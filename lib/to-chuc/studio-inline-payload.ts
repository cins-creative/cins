import { sortBaiDangByTaoLuc } from "@/lib/truong/bai-dang-timeline";
import type { TruongDetail, TruongPagePayload } from "@/lib/truong/types";

import type { StudioDetailPayload, StudioOwner } from "./studio-page-queries";

/** StudioOwner → TruongDetail tối thiểu cho `TruongInlineEditProvider`. */
function studioToTruongDetail(studio: StudioOwner): TruongDetail {
  return {
    id: studio.id,
    slug: studio.slug,
    ten: studio.ten,
    logo_id: studio.logo_id,
    avatar_id: studio.avatar_id,
    avatar_src: studio.avatar_src,
    cover_id: studio.cover_id,
    cover_src: studio.cover_src,
    mo_ta: studio.moTa,
    gioi_thieu_truong: studio.gioiThieu,
    tinh_thanh: studio.tinhThanh,
    dia_chi: studio.diaChi,
    dien_thoai: studio.dienThoai,
    email_lien_he: studio.emailLienHe,
    ma_truong: null,
    loai_truong: null,
    website: studio.website,
    ten_chinh_thuc: studio.tenChinhThuc,
    ten_tieng_anh: null,
    nam_thanh_lap: null,
    hoc_phi_nam_tu: null,
    hoc_phi_nam_den: null,
    co_ktx: null,
    ktx_gia_thang: null,
    nganhCount: 0,
    nganhTags: [],
    programs: [],
  };
}

/** Payload tối thiểu cho `TruongInlineEditProvider` trên trang studio. */
export function studioToInlinePayload(
  payload: StudioDetailPayload,
): TruongPagePayload {
  return {
    school: studioToTruongDetail(payload.studio),
    stats: {
      year: new Date().getFullYear(),
      diemChuanMax: null,
      chiTieuTong: null,
      hocPhiLabel: null,
      journeyCount: 0,
    },
    // `baidang` đã gồm mọi bài (kể cả showcase); không merge trùng.
    baidang: sortBaiDangByTaoLuc(payload.baidang),
    hinhanh: payload.hinhanh,
    tuyenSinh: [],
    journeyMembers: [],
    cauHinhYears: [],
    cauHinhMonThiByKey: {},
  };
}
