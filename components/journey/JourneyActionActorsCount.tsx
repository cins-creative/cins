"use client";

import { useState } from "react";

import { JourneySocialActorsModal } from "@/components/journey/JourneySocialActorsModal";
import type { SocialInteractionKind } from "@/lib/social/actors-types";

import "./journey-social-actors.css";

export type JourneyActionActorsConfig = {
  kind: SocialInteractionKind;
  loaiDoiTuong: string;
  idDoiTuong: string;
  count: number;
  mediaLabel?: "anh" | "bai";
};

function countAriaLabel(config: JourneyActionActorsConfig): string {
  if (config.kind === "like") {
    return config.mediaLabel === "anh"
      ? "Xem người thích ảnh"
      : "Xem người thích";
  }
  if (config.kind === "comment") return "Xem người bình luận";
  return "Xem người đã lưu";
}

type Props = {
  actors: JourneyActionActorsConfig;
};

/** Số lượt tương tác — bấm mở danh sách người (tách khỏi nút hành động chính). */
export function JourneyActionActorsCount({ actors }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="action-btn-count"
        aria-label={countAriaLabel(actors)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {actors.count}
      </button>
      <JourneySocialActorsModal
        open={open}
        onClose={() => setOpen(false)}
        kind={actors.kind}
        loaiDoiTuong={actors.loaiDoiTuong}
        idDoiTuong={actors.idDoiTuong}
        mediaLabel={actors.mediaLabel}
      />
    </>
  );
}
