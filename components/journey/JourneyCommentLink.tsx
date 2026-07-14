"use client";

import { MessageCircle } from "lucide-react";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import {
  JourneyActionActorsCount,
  type JourneyActionActorsConfig,
} from "@/components/journey/JourneyActionActorsCount";
import { JourneyActionTouchChip } from "@/components/journey/JourneyActionTouchChip";
import { JourneySocialActorsModal } from "@/components/journey/JourneySocialActorsModal";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import { useCoarsePointer } from "@/lib/ui/use-coarse-pointer";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";

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
  sharePath?: string | null;
  shareTitle?: string | null;
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
  const authGate = useOptionalAuthGate();
  const router = useRouter();
  const isAuthenticated = authGate?.isAuthenticated ?? false;
  const isCoarse = useCoarsePointer();
  const [actorsOpen, setActorsOpen] = useState(false);
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

  const openComments = useCallback(() => {
    if (!isAuthenticated) {
      if (authGate) {
        authGate.openAuthModal(
          "Đăng nhập hoặc tạo tài khoản để bình luận bài viết này.",
        );
      } else {
        router.push("/login");
      }
      return;
    }
    onOpenComments?.();
  }, [authGate, isAuthenticated, onOpenComments, router]);

  const openActors = useCallback(() => {
    if (actors) setActorsOpen(true);
  }, [actors]);

  const actorsModal =
    actors && actorsOpen ? (
      <JourneySocialActorsModal
        open={actorsOpen}
        onClose={() => setActorsOpen(false)}
        kind={actors.kind}
        loaiDoiTuong={actors.loaiDoiTuong}
        idDoiTuong={actors.idDoiTuong}
      />
    ) : null;

  const icon = <MessageCircle size={16} strokeWidth={1.8} aria-hidden />;

  if (isCoarse) {
    const press = onOpenComments
      ? openComments
      : () => {
          if (!isAuthenticated) {
            openAuthModal(
              "Đăng nhập hoặc tạo tài khoản để bình luận bài viết này.",
            );
          }
        };

    return (
      <>
        <JourneyActionTouchChip
          className="action-btn"
          ariaLabel="Bình luận"
          onPress={press}
          onLongPress={actors ? openActors : undefined}
          longPressHint={
            actors ? "Giữ để xem người bình luận" : undefined
          }
          buttonProps={
            openPostPopup ? { "data-open-post": "true" as const } : undefined
          }
        >
          {icon}
          {count > 0 ? (
            <span className="action-btn-count action-btn-count--static" aria-hidden>
              {count}
            </span>
          ) : null}
        </JourneyActionTouchChip>
        {actorsModal}
      </>
    );
  }

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
          openComments();
        }}
      >
        {icon}
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
        {icon}
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
        {icon}
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
        {icon}
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
      {icon}
    </button>,
  );
}
