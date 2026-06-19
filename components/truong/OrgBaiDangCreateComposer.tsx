"use client";

import { CinsFeedComposer } from "@/components/cins/CinsFeedComposer";

/** Composer tab bài đăng org — cùng UX user, không có cột mốc. */
export function OrgBaiDangCreateComposer() {
  return (
    <CinsFeedComposer
      layout="journey"
      showMilestone={false}
      placeholder="Đăng bài mới cho tổ chức…"
    />
  );
}
