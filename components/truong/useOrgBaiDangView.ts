"use client";

import { useState } from "react";

import type { OrgBaiDangView } from "@/lib/truong/bai-dang-grid";

/** Chỉ quản lý chế độ xem. Mở bài từ lưới → `useOrgBaiDangPostOverlay`. */
export function useOrgBaiDangView(defaultView: OrgBaiDangView = "timeline") {
  const [view, setView] = useState<OrgBaiDangView>(defaultView);
  return { view, setView };
}
