import {
  BAI_DANG_LOAI_LABELS,
  BAI_DANG_LOAI_VALUES,
  normalizeLoaiBaiDang,
} from "@/lib/truong/bai-dang";

/** Một lựa chọn loại bài đăng hiển thị trong badge / dropdown soạn bài. */
export type OrgBaiDangLoaiOption = {
  /** Giá trị enum `loai_bai_dang_org_enum` lưu DB. */
  value: string;
  /** Nhãn hiển thị (có thể khác nhau theo loại tổ chức). */
  label: string;
};

export type OrgBaiDangLoaiConfig = {
  options: OrgBaiDangLoaiOption[];
  /** Giá trị mặc định khi soạn bài mới. */
  defaultValue: string;
  /** Chuẩn hóa giá trị thô (DB) về một trong các `options`. */
  resolveValue: (raw: unknown) => string;
};

/** Cấu hình mặc định (trường ĐH / cơ sở đào tạo) — 5 loại chuẩn. */
export const SCHOOL_LOAI_CONFIG: OrgBaiDangLoaiConfig = {
  options: BAI_DANG_LOAI_VALUES.map((value) => ({
    value,
    label: BAI_DANG_LOAI_LABELS[value],
  })),
  defaultValue: "thong_bao",
  resolveValue: (raw) => normalizeLoaiBaiDang(raw),
};

/**
 * Cấu hình studio / doanh nghiệp. Dùng lại enum sẵn có:
 * `khac`→Bài đăng (mặc định), `thong_bao`→Thông báo, `su_kien`→Sự kiện,
 * `showcase`→Sản phẩm (chính là tab Showcase). Không có Tuyển sinh / Học bổng.
 */
export const STUDIO_LOAI_CONFIG: OrgBaiDangLoaiConfig = {
  options: [
    { value: "khac", label: "Bài đăng" },
    { value: "thong_bao", label: "Thông báo" },
    { value: "su_kien", label: "Sự kiện" },
    { value: "showcase", label: "Sản phẩm" },
  ],
  defaultValue: "khac",
  resolveValue: (raw) => {
    const key = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (key === "showcase") return "showcase";
    if (key === "thong_bao") return "thong_bao";
    if (key === "su_kien") return "su_kien";
    return "khac";
  },
};

/** Nhãn studio cho một giá trị `loai_bai_dang` thô. */
export function studioLoaiLabel(raw: unknown): string {
  const value = STUDIO_LOAI_CONFIG.resolveValue(raw);
  return (
    STUDIO_LOAI_CONFIG.options.find((o) => o.value === value)?.label ??
    "Bài đăng"
  );
}

/** Tìm nhãn của một value trong config (fallback value gốc). */
export function loaiOptionLabel(
  config: OrgBaiDangLoaiConfig,
  value: string,
): string {
  return config.options.find((o) => o.value === value)?.label ?? value;
}
