import type { KhoaHocDetailPayload } from "@/lib/to-chuc/khoa-hoc-types";

/** Slug cố định — mở `/co-so/{org}/khoa-hoc/_mockup-chi-tiet-khoa` để xem mockup đầy đủ. */
export const KHOA_HOC_DETAIL_MOCK_SLUG = "_mockup-chi-tiet-khoa";

/** Gộp dữ liệu API với mock khi section chưa có — giữ landing đầy đủ trên khóa thật. */
export function resolveKhoaHocDetailDisplay(
  detail: KhoaHocDetailPayload,
): KhoaHocDetailPayload {
  const mock = buildKhoaHocDetailMock(detail.orgTen);
  return {
    ...detail,
    khoa: {
      ...detail.khoa,
      moTa: detail.khoa.moTa?.trim() || mock.khoa.moTa,
      yeuCauChuanBi:
        detail.khoa.yeuCauChuanBi?.trim() || mock.khoa.yeuCauChuanBi,
    },
    giaoTrinh: detail.giaoTrinh,
    lopHoc: detail.lopHoc.length ? detail.lopHoc : mock.lopHoc,
    giaoVien: detail.giaoVien.length ? detail.giaoVien : mock.giaoVien,
  };
}

export function isKhoaHocDetailMockSlug(
  slug: string | null | undefined,
): boolean {
  return slug === KHOA_HOC_DETAIL_MOCK_SLUG;
}

/** Payload mockup khớp demo `demo-chi-tiet-khoa-landing.html`. */
export function buildKhoaHocDetailMock(
  orgTen = "Sine Art",
): KhoaHocDetailPayload {
  return {
    orgTen,
    khoa: {
      id: "mock-khoa-hoc-chi-tiet",
      slug: KHOA_HOC_DETAIL_MOCK_SLUG,
      tenKhoaHoc: "Hình họa Luyện thi đại học",
      moTa:
        "Khóa hình họa luyện thi khối V–H: dựng hình, tỷ lệ, khối và sáng tối theo barem chấm thi của Bộ. Lộ trình đi từ khối cơ bản đến tượng tròn, chân dung và toàn thân — sửa bài 1-1 mỗi buổi.",
      loaiMoHinh: "lien_tuc_theo_thang",
      trinhDoDauVao: "co_ban",
      trangThaiKhoaHoc: "dang_mo_don",
      thoiLuongBuoi: 48,
      thoiLuongPhutMoiBuoi: 180,
      hocPhi: 900_000,
      coverId: null,
      coverUrl: null,
      coverVariant: 0,
      soLopMo: 2,
      soHocVien: 24,
      ngayKhaiGiangGanNhat: null,
      lopId: null,
      hinhThuc: "truc_tiep",
      lichHoc: null,
      diaChiHoc: "67 Tân Sơn Nhì",
      yeuCauChuanBi: "bảng vẽ, chì 2B–6B, giấy A3",
    },
    giaoTrinh: [
      {
        id: "mock-gt-1",
        thuTu: 1,
        tieuDe: "Nhập môn & dựng nét cơ bản",
        moTaNgan: [
          "Cách cầm chì, đi nét thẳng – cong – đậm nhạt.",
          "Dựng khung hình, đo tỷ lệ bằng que đo.",
          "Bài tập: 20 nét cơ bản + dựng khối hộp.",
        ].join("\n"),
        soBuoi: 4,
        visibility: "public",
        hasVideo: true,
      },
      {
        id: "mock-gt-2",
        thuTu: 2,
        tieuDe: "Phối cảnh & khối cơ bản",
        moTaNgan: [
          "Phối cảnh 1–2–3 điểm tụ, đường chân trời.",
          "Khối cầu – trụ – nón: dựng & lên sáng tối.",
        ].join("\n"),
        soBuoi: 6,
        visibility: "public",
        hasVideo: false,
      },
      {
        id: "mock-gt-3",
        thuTu: 3,
        tieuDe: "Tượng tròn & mảng khối lớn",
        moTaNgan: null,
        soBuoi: 12,
        visibility: "chi_hoc_vien",
        hasVideo: true,
      },
      {
        id: "mock-gt-4",
        thuTu: 4,
        tieuDe: "Chân dung người",
        moTaNgan: null,
        soBuoi: 14,
        visibility: "chi_hoc_vien",
        hasVideo: false,
      },
      {
        id: "mock-gt-5",
        thuTu: 5,
        tieuDe: "Bài thi thử & tác phẩm cuối khóa",
        moTaNgan: null,
        soBuoi: 12,
        visibility: "chi_hoc_vien",
        hasVideo: false,
      },
    ],
    lopHoc: [
      {
        id: "mock-lop-1",
        maLop: "HHK30",
        tenLop: "Ca tối · T2-4-6",
        hinhThuc: "truc_tiep",
        lichHoc: "18:00–21:00",
        ngayKhaiGiang: "2026-01-06",
        slotToiDa: 12,
        trangThaiLop: "dang_hoc",
        conCho: true,
        giaoVienText: null,
        diaChiHoc: "67 Tân Sơn Nhì",
        giaoVien: {
          key: "mock-gv-lh",
          ten: "Linh Hà",
          slug: "linh-ha",
          verified: true,
          initials: "LH",
          vaiTro: "GV có hồ sơ CINS",
          pendingProfile: false,
        },
      },
      {
        id: "mock-lop-2",
        maLop: "HHK31",
        tenLop: "Ca sáng · T3-5-7",
        hinhThuc: "truc_tiep",
        lichHoc: "08:30–11:30",
        ngayKhaiGiang: "2026-01-07",
        slotToiDa: 12,
        trangThaiLop: "sap_khai_giang",
        conCho: true,
        giaoVienText: "Đỗ Ngọc",
        diaChiHoc: "67 Tân Sơn Nhì",
        giaoVien: {
          key: "mock-gv-dn",
          ten: "Đỗ Ngọc",
          slug: null,
          verified: false,
          initials: "ĐN",
          vaiTro: "GV chưa có hồ sơ CINS",
          pendingProfile: true,
        },
      },
    ],
    giaoVien: [
      {
        key: "mock-gv-lh",
        ten: "Linh Hà",
        slug: "linh-ha",
        verified: true,
        initials: "LH",
        vaiTro: "Senior Concept Artist · Wolfsbane",
        pendingProfile: false,
      },
      {
        key: "mock-gv-dn",
        ten: "Đỗ Ngọc",
        slug: null,
        verified: false,
        initials: "ĐN",
        vaiTro: "Giảng viên Hình họa",
        pendingProfile: true,
      },
    ],
  };
}
