export const STUDIO_TAB_IDS = [
  "bai-dang",
  "showcase",
  "tuyen-dung",
  "hinh-anh",
] as const;

export type StudioTabId = (typeof STUDIO_TAB_IDS)[number];

export const STUDIO_TAB_LABELS: Record<StudioTabId, string> = {
  "bai-dang": "Bài đăng",
  showcase: "Showcase",
  "tuyen-dung": "Tuyển dụng",
  "hinh-anh": "Hình ảnh",
};

/** Loại bài đăng (`org_bai_dang.loai_bai_dang`) hiển thị trong tab Showcase. */
export const STUDIO_SHOWCASE_LOAI = "showcase" as const;
