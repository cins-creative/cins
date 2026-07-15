import {
  isContentSurfaceView,
  type ContentSurfaceView,
} from "@/lib/cins/content-surface-view";

export const STUDIO_TAB_IDS = [
  "bai-dang",
  "showcase",
  "tuyen-dung",
  "hinh-anh",
] as const;

export type StudioTabId = (typeof STUDIO_TAB_IDS)[number];

/** Tab có thể ẩn qua `org_to_chuc.cau_hinh.tabs` (mặc định hiện). */
export type StudioOptionalTabId = "hinh-anh";

export type StudioPageTabsConfig = Partial<Record<StudioOptionalTabId, boolean>>;

/** Mặc định runtime khi chưa cấu hình — khớp soft-default hiện tại của Showcase. */
export const STUDIO_SHOWCASE_DEFAULT_VIEW: ContentSurfaceView = "masonry";

export type StudioPageCauHinh = {
  tabs?: StudioPageTabsConfig;
  /** Chế độ xem mặc định tab Showcase (`ContentSurfaceView`). */
  showcaseDefaultView?: ContentSurfaceView;
};

export const STUDIO_OPTIONAL_TAB_IDS: readonly StudioOptionalTabId[] = [
  "hinh-anh",
];

export const STUDIO_TAB_LABELS: Record<StudioTabId, string> = {
  "bai-dang": "Bài đăng",
  showcase: "Showcase",
  "tuyen-dung": "Tuyển dụng",
  "hinh-anh": "Hình ảnh",
};

/** Loại bài đăng (`org_bai_dang.loai_bai_dang`) hiển thị trong tab Showcase. */
export const STUDIO_SHOWCASE_LOAI = "showcase" as const;

export const STUDIO_SHOWCASE_VIEW_OPTIONS: ReadonlyArray<{
  value: ContentSurfaceView;
  label: string;
  desc: string;
}> = [
  {
    value: "timeline",
    label: "Dòng thời gian",
    desc: "Bài showcase xếp theo thời gian như feed.",
  },
  {
    value: "grid",
    label: "Dạng thẻ",
    desc: "Lưới thẻ đều nhau, dễ quét tiêu đề và ảnh.",
  },
  {
    value: "masonry",
    label: "Lưới gọn",
    desc: "Bố cục masonry gọn — mặc định cho showcase.",
  },
];

export function normalizeStudioShowcaseDefaultView(
  value: unknown,
): ContentSurfaceView {
  return typeof value === "string" && isContentSurfaceView(value)
    ? value
    : STUDIO_SHOWCASE_DEFAULT_VIEW;
}

export function parseStudioPageCauHinh(raw: unknown): StudioPageCauHinh {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const tabsRaw = obj.tabs;
  const tabs: StudioPageTabsConfig = {};
  if (tabsRaw && typeof tabsRaw === "object" && !Array.isArray(tabsRaw)) {
    for (const id of STUDIO_OPTIONAL_TAB_IDS) {
      const val = (tabsRaw as Record<string, unknown>)[id];
      if (typeof val === "boolean") tabs[id] = val;
    }
  }
  const result: StudioPageCauHinh = {};
  if (Object.keys(tabs).length > 0) result.tabs = tabs;
  if (
    typeof obj.showcaseDefaultView === "string" &&
    isContentSurfaceView(obj.showcaseDefaultView)
  ) {
    result.showcaseDefaultView = obj.showcaseDefaultView;
  }
  return result;
}

export function mergeStudioPageCauHinh(
  existing: unknown,
  patch: StudioPageCauHinh,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const prev = parseStudioPageCauHinh(existing);
  const nextTabs = { ...(prev.tabs ?? {}), ...(patch.tabs ?? {}) };
  const next: Record<string, unknown> = {
    ...base,
    tabs: nextTabs,
  };
  const view =
    patch.showcaseDefaultView !== undefined
      ? patch.showcaseDefaultView
      : prev.showcaseDefaultView;
  if (view) next.showcaseDefaultView = view;
  else delete next.showcaseDefaultView;
  return next;
}

/** Tab cố định luôn hiện; tab tùy chọn ẩn khi `tabs[id] === false`. */
export function isStudioTabVisible(
  tabId: StudioTabId,
  config?: StudioPageCauHinh,
): boolean {
  if (tabId === "bai-dang" || tabId === "showcase" || tabId === "tuyen-dung") {
    return true;
  }
  return config?.tabs?.[tabId] !== false;
}

export function listVisibleStudioTabs(
  config?: StudioPageCauHinh,
): StudioTabId[] {
  return STUDIO_TAB_IDS.filter((id) => isStudioTabVisible(id, config));
}
