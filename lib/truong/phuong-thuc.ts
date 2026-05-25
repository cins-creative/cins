import type { TruongPhuongThuc, TruongTuyenSinhNamRow } from "@/lib/truong/types";

export const PHUONG_THUC_LABELS: Record<string, string> = {
  xet_diem_thi_thpt: "Xét điểm thi THPT",
  xet_hoc_ba: "Xét học bạ",
  danh_gia_nang_luc: "Đánh giá năng lực",
  xet_tuyen_thang: "Xét tuyển thẳng",
  nang_khieu: "Thi năng khiếu",
  phong_van: "Phỏng vấn năng lực",
  danh_gia_tu_duy: "Đánh giá tư duy",
  thi_van_hoa_rieng: "Thi văn hóa riêng",
  nang_khieu_ket_hop: "Thi năng khiếu kết hợp học bạ",
  chung_chi_sat: "Chứng chỉ SAT",
  chung_chi_act: "Chứng chỉ ACT",
  chung_chi_ib: "Chứng chỉ IB",
  bang_nuoc_ngoai: "Bằng nước ngoài",
  v_sat: "V-SAT",
  ket_hop: "Kết hợp",
};

export function labelPhuongThuc(code: string | null): string {
  if (!code) return "Phương thức xét tuyển";
  return PHUONG_THUC_LABELS[code] ?? code.replace(/_/g, " ");
}

/** Giải thích ngắn cho học viên (tooltip tab Tuyển sinh). */
export const PHUONG_THUC_TOOLTIPS: Record<string, string> = {
  xet_diem_thi_thpt:
    "Trường xét tuyển dựa trên điểm kỳ thi tốt nghiệp THPT quốc gia (tổng điểm hoặc từng môn theo tổ hợm/khối trường công bố). Thường có điểm sàn và điểm chuẩn riêng từng ngành.",
  xet_hoc_ba:
    "Xét theo điểm trung bình học tập (thường lớp 10–12 hoặc theo quy định trường), có thể kèm hạnh kiểm, giải thưởng. Một số trường cho phép xét học bạ mà không cần dùng điểm thi THPT nếu đủ điều kiện.",
  danh_gia_nang_luc:
    "Dùng điểm bài thi đánh giá năng lực (ví dụ ĐGNL của ĐHQG-HCM, HN hoặc bài thi tương đương). Đây là một kênh xét tuyển riêng, song song với THPT hoặc học bạ.",
  xet_tuyen_thang:
    "Ưu tiên thí sinh đạt giải học sinh giỏi, chứng chỉ quốc tế, học sinh chuyên… theo danh mục trường công bố. Thường được miễn thi hoặc cộng điểm, tùy quy chế từng trường.",
  nang_khieu:
    "Tuyển theo kết quả thi năng khiếu (âm nhạc, mỹ thuật, thể thao…) kết hợp điều kiện học lực hoặc điểm THPT mà trường yêu cầu.",
  phong_van:
    "Phỏng vấn để đánh giá năng lực, định hướng hoặc ngoại ngữ. Kết quả phỏng vấn là một tiêu chí trong hồ sơ, có thể kèm điểm tối thiểu.",
  danh_gia_tu_duy:
    "Bài thi hoặc bộ đề đánh giá tư duy logic, phân tích. Một số trường tự tổ chức, một số dùng bài thi chuẩn hóa làm căn cứ xét tuyển.",
  thi_van_hoa_rieng:
    "Trường tự tổ chức hoặc áp dụng kỳ thi văn hóa riêng (ngoài hoặc kết hợp THPT), thường cho ngành hoặc chương trình đặc thù.",
  nang_khieu_ket_hop:
    "Kết hợp điểm thi năng khiếu với học bạ hoặc THPT theo công thức và tỷ lệ % do trường công bố trong đề án tuyển sinh.",
  chung_chi_sat:
    "Xét bằng điểm SAT (bài thi chuẩn hóa quốc tế) đạt ngưỡng trường quy định, có thể kèm điều kiện về điểm học tập.",
  chung_chi_act:
    "Xét theo điểm ACT (American College Testing) tối thiểu mà trường yêu cầu, thường dành cho thí sinh có lộ trình quốc tế.",
  chung_chi_ib:
    "Xét hồ sơ Chương trình Tú tài Quốc tế IB (International Baccalaureate) đạt điều kiện trường đưa ra.",
  bang_nuoc_ngoai:
    "Xét bằng tốt nghiệp trung học nước ngoài (A-Level, AP, bằng tương đương) được trường công nhận theo quy định Bộ GD&ĐT.",
  v_sat:
    "Dùng điểm kỳ thi V-SAT (bài thi chuẩn hóa trong nước) làm căn cứ xét tuyển hoặc miễn một phần điều kiện thi.",
  ket_hop:
    "Trường cộng hợp nhiều nguồn điểm (THPT, học bạ, chứng chỉ, phỏng vấn…) theo công thức tổng hợp riêng trong đề án tuyển sinh.",
};

export function phuongThucTooltip(code: string | null): string | null {
  if (!code) return null;
  return PHUONG_THUC_TOOLTIPS[code] ?? null;
}

export type CalcPhuongThucOption = TruongPhuongThuc & {
  label: string;
};

/** Gộp phương thức theo id (hoặc ten) trong các dòng tuyển sinh cùng năm. */
export function aggregatePhuongThucForCalc(
  yearRows: TruongTuyenSinhNamRow[],
): CalcPhuongThucOption[] {
  const map = new Map<string, CalcPhuongThucOption>();
  for (const row of yearRows) {
    for (const pt of row.phuongThuc) {
      const key = pt.id || pt.ten_phuong_thuc || "";
      if (!key || map.has(key)) continue;
      map.set(key, {
        ...pt,
        label: labelPhuongThuc(pt.ten_phuong_thuc),
      });
    }
  }
  return [...map.values()];
}

export const PHUONG_THUC_ENUM_OPTIONS = Object.entries(PHUONG_THUC_LABELS).map(
  ([value, label]) => ({ value, label }),
);
