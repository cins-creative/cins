"use client";

import { CalendarClock, X } from "lucide-react";
import { useState } from "react";

import { OrgBaiDangJourneyCard } from "@/components/truong/OrgBaiDangJourneyCard";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  posts: TruongBaiDang[];
};

export function OrgBaiDangScheduledQueue({ posts }: Props) {
  const [open, setOpen] = useState(false);

  if (posts.length === 0) return null;

  return (
    <>
      <button
        type="button"
        className="org-baidang-scheduled-chip"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <CalendarClock size={14} strokeWidth={2.2} aria-hidden />
        <span className="org-baidang-scheduled-chip-label">
          Bài viết hẹn lịch đăng
        </span>
        <span className="org-baidang-scheduled-chip-count">{posts.length}</span>
      </button>

      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal--wide org-baidang-scheduled-modal"
        labelledBy="org-baidang-scheduled-modal-title"
      >
        <div className="org-baidang-scheduled-modal-head">
          <div>
            <h3
              id="org-baidang-scheduled-modal-title"
              className="tdh-inline-modal-title"
            >
              Bài viết hẹn lịch đăng
            </h3>
            <p className="org-baidang-scheduled-modal-hint">
              {posts.length} bài — sẽ hiện trên timeline khi đến giờ hẹn.
            </p>
          </div>
          <button
            type="button"
            className="org-baidang-scheduled-modal-close"
            aria-label="Đóng"
            onClick={() => setOpen(false)}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="org-baidang-scheduled-modal-list">
          {posts.map((post) => (
            <OrgBaiDangJourneyCard key={post.id} post={post} />
          ))}
        </div>
        <div className="tdh-inline-modal-actions">
          <button
            type="button"
            className="tdh-inline-btn ghost"
            onClick={() => setOpen(false)}
          >
            Đóng
          </button>
        </div>
      </TruongInlineModal>
    </>
  );
}
