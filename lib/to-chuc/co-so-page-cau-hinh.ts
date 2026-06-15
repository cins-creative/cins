export const CO_SO_TAB_IDS = [
  "bai-dang",
  "khoa-hoc",
  "san-pham",
  "hinh-anh",
] as const;

export type CoSoTabId = (typeof CO_SO_TAB_IDS)[number];

export type CoSoOptionalTabId = Exclude<CoSoTabId, "bai-dang">;

export type CoSoPageTabsConfig = Partial<Record<CoSoOptionalTabId, boolean>>;

export type CoSoPageCauHinh = {
  tabs?: CoSoPageTabsConfig;
};

export const CO_SO_TAB_LABELS: Record<CoSoTabId, string> = {
  "bai-dang": "Bài đăng",
  "khoa-hoc": "Khóa học",
  "san-pham": "Sản phẩm học viên",
  "hinh-anh": "Hình ảnh cơ sở",
};

export function parseCoSoPageCauHinh(raw: unknown): CoSoPageCauHinh {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const tabsRaw = (raw as { tabs?: unknown }).tabs;
  if (!tabsRaw || typeof tabsRaw !== "object" || Array.isArray(tabsRaw)) {
    return {};
  }
  const tabs: CoSoPageTabsConfig = {};
  for (const id of ["khoa-hoc", "san-pham", "hinh-anh"] as const) {
    const val = (tabsRaw as Record<string, unknown>)[id];
    if (typeof val === "boolean") tabs[id] = val;
  }
  return { tabs: Object.keys(tabs).length > 0 ? tabs : undefined };
}

export function mergeCoSoPageCauHinh(
  existing: unknown,
  patch: CoSoPageCauHinh,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const prevTabs = parseCoSoPageCauHinh(existing).tabs ?? {};
  const nextTabs = { ...prevTabs, ...patch.tabs };
  return {
    ...base,
    tabs: nextTabs,
  };
}

/** Tab luôn hiển thị — cấu hình ẩn/hiện đã bỏ khỏi UI cài đặt. */
export function isCoSoTabVisible(
  _tabId: CoSoTabId,
  _config?: CoSoPageCauHinh,
): boolean {
  return true;
}

export function listVisibleCoSoTabs(config: CoSoPageCauHinh): CoSoTabId[] {
  return CO_SO_TAB_IDS.filter((id) => isCoSoTabVisible(id, config));
}
