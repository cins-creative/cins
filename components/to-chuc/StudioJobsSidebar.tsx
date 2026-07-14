"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongYearSelect } from "@/components/truong/YearFilterProvider";
import { currentCalendarYear } from "@/lib/truong/diem-chuan";
import {
  countUpcomingTimelineSteps,
  getAdmissionTimelineFocus,
  timelineLinkHref,
  timelineLinkLabel,
  type TuyenSinhTimelineStep,
} from "@/lib/truong/timeline-steps";
import { isValidTruongYear } from "@/lib/truong/year-tabs";
import type { TruongBaiDang } from "@/lib/truong/types";
import type { StudioJob } from "@/lib/to-chuc/studio-tuyen-dung-types";
import {
  buildStudioBaiDangSteps,
  buildStudioJobSteps,
  collectStudioTimelineYears,
  studioBaiDangStepSortKey,
} from "@/lib/to-chuc/studio-timeline";

type Props = {
  jobs: StudioJob[];
  orgSlug: string;
  /** Fallback khi không có `TruongInlineEditProvider` (khách). */
  posts?: TruongBaiDang[];
  canManage?: boolean;
  onUpcomingCountChange?: (count: number) => void;
};

type StepRole = "past" | "current" | "next" | "default";

function TimelineStepItem({
  step,
  role,
}: {
  step: TuyenSinhTimelineStep;
  role: StepRole;
}) {
  const className = [
    "timeline-item",
    step.status,
    role === "past" ? "timeline-item--past" : "",
    role === "current" ? "timeline-item--focus timeline-item--current" : "",
    role === "next" ? "timeline-item--focus timeline-item--next" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const labelNode =
    step.link ? (
      step.link.startsWith("/") ? (
        <Link
          href={step.link}
          className="timeline-label timeline-label--link"
          title={step.label}
        >
          {step.label}
        </Link>
      ) : (
        <a
          href={timelineLinkHref(step.link)}
          className="timeline-label timeline-label--link"
          target="_blank"
          rel="noopener noreferrer"
          title={timelineLinkLabel(step.link)}
        >
          {step.label}
        </a>
      )
    ) : (
      <div className="timeline-label">{step.label}</div>
    );

  return (
    <div className={className}>
      <div className="timeline-dot">{step.dot}</div>
      <div className="timeline-content">
        {role === "next" ? (
          <span className="timeline-focus-kicker">Tiếp theo</span>
        ) : null}
        {role === "current" ? (
          <span className="timeline-focus-kicker timeline-focus-kicker--now">
            Hiện tại
          </span>
        ) : null}
        <div
          className={[
            "timeline-date",
            step.status === "active" ? "timeline-date--live" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {step.dateLabel}
        </div>
        {labelNode}
        {step.desc ? <p className="timeline-desc">{step.desc}</p> : null}
      </div>
    </div>
  );
}

export function StudioJobsSidebar({
  jobs,
  orgSlug,
  posts: postsProp = [],
  canManage = false,
  onUpcomingCountChange,
}: Props) {
  const ctx = useTruongInlineEdit();
  const isManaging = canManage && (ctx?.isEditing ?? false);

  const [showPastSteps, setShowPastSteps] = useState(false);
  const [timelineYear, setTimelineYear] = useState(currentCalendarYear());

  const allPosts = useMemo(() => {
    if (!ctx) return postsProp;
    const published = ctx.baidang ?? [];
    if (!isManaging) return published;
    const scheduled = ctx.scheduledBaidang ?? [];
    const byId = new Map<string, TruongBaiDang>();
    for (const p of [...published, ...scheduled]) {
      byId.set(p.id, p);
    }
    return [...byId.values()];
  }, [ctx, postsProp, isManaging]);

  const jobSteps = useMemo(
    () => buildStudioJobSteps(jobs, orgSlug),
    [jobs, orgSlug],
  );

  const baiDangSteps = useMemo(
    () =>
      buildStudioBaiDangSteps(
        allPosts,
        orgSlug,
        timelineYear,
        isManaging,
      ),
    [allPosts, orgSlug, timelineYear, isManaging],
  );

  const timelineYearOptions = useMemo(() => {
    const unique = collectStudioTimelineYears(allPosts, jobs, isManaging);
    if (
      isManaging &&
      isValidTruongYear(timelineYear) &&
      !unique.includes(timelineYear)
    ) {
      return [timelineYear, ...unique].sort((a, b) => b - a);
    }
    return unique;
  }, [allPosts, jobs, isManaging, timelineYear]);

  useEffect(() => {
    if (!timelineYearOptions.length) return;
    if (!timelineYearOptions.includes(timelineYear)) {
      setTimelineYear(timelineYearOptions[0]!);
    }
  }, [timelineYearOptions, timelineYear]);

  const timelineSteps = useMemo(() => {
    const dated = [...baiDangSteps].sort(
      (a, b) =>
        studioBaiDangStepSortKey(a, allPosts) -
        studioBaiDangStepSortKey(b, allPosts),
    );
    return [...jobSteps, ...dated];
  }, [jobSteps, baiDangSteps, allPosts]);

  const focus = useMemo(
    () => getAdmissionTimelineFocus(timelineSteps),
    [timelineSteps],
  );

  const pastSteps = useMemo(
    () => timelineSteps.filter((s) => focus.pastIds.has(s.id)),
    [timelineSteps, focus.pastIds],
  );

  const visibleSteps = useMemo(
    () =>
      showPastSteps
        ? timelineSteps
        : timelineSteps.filter((s) => !focus.pastIds.has(s.id)),
    [timelineSteps, focus.pastIds, showPastSteps],
  );

  useEffect(() => {
    onUpcomingCountChange?.(countUpcomingTimelineSteps(timelineSteps));
  }, [timelineSteps, onUpcomingCountChange]);

  useEffect(() => {
    setShowPastSteps(false);
  }, [timelineYear, timelineSteps.length]);

  function stepRole(step: TuyenSinhTimelineStep): StepRole {
    if (focus.pastIds.has(step.id)) return "past";
    if (step.id === focus.currentId) return "current";
    if (step.id === focus.nextId) return "next";
    return "default";
  }

  const hasContent = timelineSteps.length > 0;

  return (
    <aside className="tdh-admission-side" aria-label="Tuyển dụng và thông báo">
      <div className="tdh-admission-side-head">
        <div className="tdh-admission-side-year-row">
          <p className="timeline-year-kicker">Thông báo</p>
          <TruongYearSelect
            label="Năm lịch"
            years={timelineYearOptions}
            value={timelineYear}
            onChange={setTimelineYear}
          />
        </div>
      </div>

      <section className="timeline-section timeline-section--rail">
        {!hasContent && !isManaging ? (
          <p className="ptxt-empty-text tdh-admission-side-empty">
            Chưa có tin tuyển dụng hay thông báo. Vị trí đang mở và bài đăng
            nhãn Thông báo / Sự kiện sẽ hiển thị tại đây.
          </p>
        ) : (
          <div className="timeline">
            {!showPastSteps && pastSteps.length > 0 ? (
              <button
                type="button"
                className="timeline-past-toggle"
                onClick={() => setShowPastSteps(true)}
              >
                Xem thêm {pastSteps.length} mốc đã qua
              </button>
            ) : null}
            {showPastSteps && pastSteps.length > 0 ? (
              <button
                type="button"
                className="timeline-past-toggle timeline-past-toggle--collapse"
                onClick={() => setShowPastSteps(false)}
              >
                Ẩn mốc đã qua
              </button>
            ) : null}

            {visibleSteps.map((step) => (
              <TimelineStepItem
                key={step.id}
                step={step}
                role={stepRole(step)}
              />
            ))}

            {isManaging && timelineSteps.length === 0 ? (
              <p className="ptxt-empty-text tdh-admission-side-empty">
                Chưa có mốc cho năm {timelineYear}. Đăng bài với nhãn Thông báo
                hoặc Sự kiện trên tab Bài đăng — đổi nhãn bằng badge trên từng
                bài.
              </p>
            ) : null}
          </div>
        )}
      </section>
    </aside>
  );
}
