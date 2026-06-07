"use client";

import { Calendar, Pencil, Sparkles } from "lucide-react";
import { useState } from "react";

import { CongDongEventRailEditorModal } from "@/components/cong-dong/CongDongEventRailEditorModal";
import { congDongBannerImageUrl } from "@/lib/cong-dong/images";
import type {
  CongDongEventRailDisplay,
  CongDongEventRailState,
} from "@/lib/cong-dong/types";

type Props = {
  orgId: string;
  eventRail: CongDongEventRailState;
  canManage: boolean;
  onEventRailChange: (next: CongDongEventRailState) => void;
};

function formatEventWhen(batDau: string, ketThuc: string): string {
  const start = new Date(batDau);
  const end = new Date(ketThuc);
  const dateFmt = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const startDate = dateFmt.format(start);
  if (dateFmt.format(end) === startDate) {
    return `${startDate} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
  }
  return `${startDate} ${timeFmt.format(start)} → ${dateFmt.format(end)}`;
}

function hasEventInfo(display: CongDongEventRailDisplay): boolean {
  return Boolean(
    display.tieuDe?.trim() ||
      display.moTa?.trim() ||
      (display.batDau && display.ketThuc),
  );
}

function EventRailInfo({ display }: { display: CongDongEventRailDisplay }) {
  if (!hasEventInfo(display)) return null;

  const when =
    display.batDau && display.ketThuc
      ? formatEventWhen(display.batDau, display.ketThuc)
      : null;

  return (
    <div className="cd-v4-event-rail-info">
      {display.source === "scheduled" ? (
        <span className="cd-v4-event-rail-info-tag">Đang chạy</span>
      ) : null}
      {display.tieuDe?.trim() ? (
        <h3 className="cd-v4-event-rail-info-title">{display.tieuDe}</h3>
      ) : null}
      {display.moTa?.trim() ? (
        <p className="cd-v4-event-rail-info-desc">{display.moTa}</p>
      ) : null}
      {when ? (
        <p className="cd-v4-event-rail-info-meta">
          <Calendar size={13} strokeWidth={2} aria-hidden />
          {when}
        </p>
      ) : null}
    </div>
  );
}

function EventRailImage({
  display,
  canManage,
  onEdit,
}: {
  display: CongDongEventRailDisplay;
  canManage: boolean;
  onEdit: () => void;
}) {
  const coverSrc = congDongBannerImageUrl(display.coverId);

  return (
    <div
      className={`cd-v4-event-rail-visual${coverSrc ? " has-img" : ""}${canManage ? " is-manageable" : ""}`}
    >
      {coverSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={coverSrc} alt="" loading="lazy" />
      ) : (
        <div className="cd-v4-event-rail-fallback" aria-hidden>
          <Sparkles size={28} strokeWidth={1.6} />
        </div>
      )}
      {canManage ? (
        <button
          type="button"
          className="cd-v4-event-rail-edit-hover"
          aria-label="Chỉnh sửa banner sự kiện"
          onClick={onEdit}
        >
          <Pencil size={16} strokeWidth={2} aria-hidden />
          <span>Chỉnh sửa</span>
        </button>
      ) : null}
    </div>
  );
}

export function CongDongEventRail({
  orgId,
  eventRail,
  canManage,
  onEventRailChange,
}: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const openEditor = () => setEditorOpen(true);

  return (
    <>
      <div className="cd-v4-event-rail-col">
        <aside className="cd-v4-event-rail" aria-label="Sự kiện cộng đồng">
          <div className="cd-v4-event-rail-frame">
            <EventRailImage
              display={eventRail.display}
              canManage={canManage}
              onEdit={openEditor}
            />
            <EventRailInfo display={eventRail.display} />
          </div>
        </aside>
      </div>

      {canManage ? (
        <CongDongEventRailEditorModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          orgId={orgId}
          config={eventRail.config}
          display={eventRail.display}
          onSaved={(next) => {
            onEventRailChange(next);
            setEditorOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
