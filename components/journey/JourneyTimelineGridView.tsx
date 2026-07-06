"use client";

import { Play } from "lucide-react";

import type {
  MilestoneItem,
  MilestoneType,
} from "@/components/journey/milestone-types";

const TYPE_LABELS: Record<MilestoneType, string> = {
  hoc: "Học tập",
  lam: "Công việc",
  "du-an": "Dự án",
  "su-kien": "Sự kiện",
  "thanh-tuu": "Thành tựu",
  "ca-nhan": "Cá nhân",
  bookmark: "Lưu về",
};

type Props = {
  milestones: ReadonlyArray<MilestoneItem>;
  onOpenMilestone: (milestoneId: string) => void;
};

function milestoneScrollId(m: MilestoneItem): string {
  return (m.cotMocId ?? m.id).trim();
}

export function JourneyTimelineGridView({
  milestones,
  onOpenMilestone,
}: Props) {
  if (milestones.length === 0) {
    return (
      <p className="j-timeline-grid-empty">
        Không có cột mốc thuộc nhóm lọc này.
      </p>
    );
  }

  return (
    <div
      className="j-timeline-grid org-baidang-grid"
      role="list"
      aria-label="Lưới cột mốc"
    >
      {milestones.map((m) => {
        const scrollId = milestoneScrollId(m);
        const thumb = m.media?.[0];
        const thumbSrc = thumb?.src?.trim() || null;
        const isVideo = Boolean(thumb?.isVideo);
        const title = m.title?.trim() || "Không tiêu đề";
        const excerpt = m.tacPhamMoTa?.trim() || m.body?.trim() || null;

        return (
          <button
            key={m.id}
            type="button"
            role="listitem"
            className={`org-baidang-grid-cell j-timeline-grid-cell${
              thumbSrc ? " has-thumb" : " is-text"
            }`}
            onClick={() => onOpenMilestone(scrollId)}
            aria-label={`Mở cột mốc: ${title}`}
          >
            {thumbSrc ? (
              <span className="obg-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbSrc} alt="" loading="lazy" decoding="async" />
                {isVideo ? (
                  <span className="obg-play" aria-hidden>
                    <Play size={18} strokeWidth={2.4} />
                  </span>
                ) : null}
              </span>
            ) : null}
            <span className="obg-body">
              <span className="obg-loai">{TYPE_LABELS[m.type]}</span>
              <strong className="obg-title">{title}</strong>
              {excerpt ? <span className="obg-excerpt">{excerpt}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
