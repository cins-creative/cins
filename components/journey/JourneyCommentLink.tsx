"use client";

import { MessageCircle } from "lucide-react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import {
  JourneyActionActorsCount,
  type JourneyActionActorsConfig,
} from "@/components/journey/JourneyActionActorsCount";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import { useMemo, type ReactNode } from "react";

type Props = {
  href?: string;
  commentCount?: number | null;
  /** Timeline inline — mở panel bình luận trong card, không navigate popup. */
  onOpenComments?: () => void;
  /** Mở popup bài viết (`data-open-post`) thay vì panel inline. */
  openPostPopup?: boolean;
  idDoiTuong?: string;
  loaiDoiTuong?: string;
  disableActorsReveal?: boolean;
};

function CommentCount({
  count,
  actors,
  disableActorsReveal,
}: {
  count: number;
  actors: JourneyActionActorsConfig | null;
  disableActorsReveal: boolean;
}) {
  if (count <= 0) return null;
  if (actors && !disableActorsReveal) {
    return <JourneyActionActorsCount actors={actors} />;
  }
  return (
    <span className="action-btn-count action-btn-count--static" aria-hidden>
      {count}
    </span>
  );
}

export function JourneyCommentLink({
  href,
  commentCount,
  onOpenComments,
  openPostPopup = false,
  idDoiTuong,
  loaiDoiTuong = SOCIAL_LOAI_DOI_TUONG.COT_MOC,
  disableActorsReveal = false,
}: Props) {
  const { isAuthenticated, openAuthModal } = useAuthGate();
  const count = commentCount ?? 0;

  const actors = useMemo<JourneyActionActorsConfig | null>(() => {
    if (disableActorsReveal || count <= 0 || !idDoiTuong) return null;
    return {
      kind: "comment",
      loaiDoiTuong,
      idDoiTuong,
      count,
    };
  }, [count, disableActorsReveal, idDoiTuong, loaiDoiTuong]);

  const wrap = (iconControl: ReactNode) => {
    if (count <= 0) return iconControl;
    return (
      <span className="action-btn action-btn--split">
        {iconControl}
        <CommentCount
          count={count}
          actors={actors}
          disableActorsReveal={disableActorsReveal}
        />
      </span>
    );
  };

  if (onOpenComments) {
    return wrap(
      <button
        type="button"
        className={count > 0 ? "action-btn-part action-btn-part--icon" : "action-btn"}
        aria-label="Bình luận"
        onClick={(e) => {
          e.stopPropagation();
          if (!isAuthenticated) {
            openAuthModal(
              "Đăng nhập hoặc tạo tài khoản để bình luận bài viết này.",
            );
            return;
          }
          onOpenComments();
        }}
      >
        <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
      </button>,
    );
  }

  if (openPostPopup) {
    return wrap(
      <button
        type="button"
        className={count > 0 ? "action-btn-part action-btn-part--icon" : "action-btn"}
        aria-label="Bình luận"
        data-open-post="true"
      >
        <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
      </button>,
    );
  }

  if (!href) {
    return wrap(
      <button
        type="button"
        className={count > 0 ? "action-btn-part action-btn-part--icon" : "action-btn"}
        aria-label="Bình luận"
      >
        <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
      </button>,
    );
  }

  if (isAuthenticated) {
    return wrap(
      <a
        href={href}
        className={count > 0 ? "action-btn-part action-btn-part--icon" : "action-btn"}
        aria-label="Bình luận"
      >
        <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
      </a>,
    );
  }

  return wrap(
    <button
      type="button"
      className={count > 0 ? "action-btn-part action-btn-part--icon" : "action-btn"}
      aria-label="Bình luận — cần đăng nhập"
      onClick={() =>
        openAuthModal("Đăng nhập hoặc tạo tài khoản để bình luận bài viết này.")
      }
    >
      <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
    </button>,
  );
}
