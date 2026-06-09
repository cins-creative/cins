"use client";

import { CalendarClock } from "lucide-react";

import {
  formatOrgBaiDangScheduleLabel,
  isTruongBaiDangScheduled,
} from "@/lib/truong/org-bai-dang-schedule";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  post: TruongBaiDang;
};

export function OrgBaiDangScheduledBadge({ post }: Props) {
  if (!isTruongBaiDangScheduled(post)) return null;

  const when = formatOrgBaiDangScheduleLabel(post.tao_luc);
  const title = when ? `Hẹn đăng ${when}` : "Bài hẹn đăng";

  return (
    <span className="org-baidang-scheduled-badge" title={title}>
      <CalendarClock size={13} strokeWidth={2.2} aria-hidden />
      <span className="org-baidang-scheduled-badge-label">Hẹn đăng</span>
      {when ? (
        <span className="org-baidang-scheduled-badge-time">{when}</span>
      ) : null}
    </span>
  );
}
