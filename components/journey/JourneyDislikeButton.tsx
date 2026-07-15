"use client";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import {
  JourneyActionActorsCount,
  type JourneyActionActorsConfig,
} from "@/components/journey/JourneyActionActorsCount";
import { JourneyActionTouchChip } from "@/components/journey/JourneyActionTouchChip";
import { JourneySocialActorsModal } from "@/components/journey/JourneySocialActorsModal";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import { REACTION_EMOJI } from "@/lib/social/reaction-emoji";
import { useCoarsePointer } from "@/lib/ui/use-coarse-pointer";
import { ThumbsDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

type Props = {
  milestoneId: string;
  initialDisliked?: boolean;
  initialCount?: number;
  showCount?: boolean;
  loaiDoiTuong?: string;
  actorsMediaLabel?: JourneyActionActorsConfig["mediaLabel"];
  disableActorsReveal?: boolean;
};

type SocialEvent = CustomEvent<{
  milestoneId: string;
  liked?: boolean;
  likeCount?: number;
  disliked?: boolean;
  dislikeCount?: number;
}>;

export function JourneyDislikeButton({
  milestoneId,
  initialDisliked = false,
  initialCount = 0,
  showCount = false,
  loaiDoiTuong = SOCIAL_LOAI_DOI_TUONG.COT_MOC,
  actorsMediaLabel,
  disableActorsReveal = false,
}: Props) {
  const authGate = useOptionalAuthGate();
  const router = useRouter();
  const requireAuth = useCallback(
    (action: () => void) => {
      if (authGate) {
        authGate.requireAuth(action);
        return;
      }
      router.push("/login");
    },
    [authGate, router],
  );
  const isCoarse = useCoarsePointer();
  const [disliked, setDisliked] = useState(initialDisliked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const [actorsOpen, setActorsOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setDisliked(initialDisliked);
      setCount(initialCount);
    });
  }, [initialDisliked, initialCount]);

  useEffect(() => {
    const onSocial = (event: Event) => {
      const detail = (event as SocialEvent).detail;
      if (detail.milestoneId !== milestoneId) return;
      if (typeof detail.dislikeCount === "number") setCount(detail.dislikeCount);
      if (detail.liked === true) {
        setDisliked((prev) => {
          if (prev && typeof detail.dislikeCount !== "number") {
            setCount((c) => Math.max(0, c - 1));
          }
          return false;
        });
        return;
      }
      if (typeof detail.disliked === "boolean") setDisliked(detail.disliked);
    };
    window.addEventListener("cins:social-action", onSocial);
    return () => window.removeEventListener("cins:social-action", onSocial);
  }, [milestoneId]);

  const toggle = useCallback(() => {
    requireAuth(() => {
      const nextDisliked = !disliked;
      const nextCount = Math.max(0, count + (nextDisliked ? 1 : -1));
      setDisliked(nextDisliked);
      setCount(nextCount);
      window.dispatchEvent(
        new CustomEvent("cins:social-action", {
          detail: {
            milestoneId,
            disliked: nextDisliked,
            dislikeCount: nextCount,
            ...(nextDisliked ? { liked: false } : {}),
          },
        }),
      );
      startTransition(async () => {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai_doi_tuong: loaiDoiTuong,
            id_doi_tuong: milestoneId,
            emoji: REACTION_EMOJI.DISLIKE,
            active: nextDisliked,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) return;
          setDisliked(disliked);
          setCount(count);
          return;
        }
        const syncedDisliked = Boolean(json.disliked);
        const syncedCount = Number(json.dislikeCount ?? json.count ?? nextCount);
        const syncedLiked = Boolean(json.liked);
        const syncedLikeCount =
          typeof json.likeCount === "number" ? json.likeCount : undefined;
        setDisliked(syncedDisliked);
        setCount(syncedCount);
        window.dispatchEvent(
          new CustomEvent("cins:social-action", {
            detail: {
              milestoneId,
              disliked: syncedDisliked,
              dislikeCount: syncedCount,
              liked: syncedLiked,
              ...(syncedLikeCount !== undefined
                ? { likeCount: syncedLikeCount }
                : {}),
            },
          }),
        );
      });
    });
  }, [count, disliked, loaiDoiTuong, milestoneId, requireAuth]);

  const actors = useMemo<JourneyActionActorsConfig | null>(() => {
    if (disableActorsReveal || count <= 0) return null;
    return {
      kind: "dislike",
      loaiDoiTuong,
      idDoiTuong: milestoneId,
      count,
      mediaLabel: actorsMediaLabel,
    };
  }, [
    actorsMediaLabel,
    count,
    disableActorsReveal,
    loaiDoiTuong,
    milestoneId,
  ]);

  const showCountChip = showCount && count > 0;
  const displayCount = count > 0 ? `−${count}` : String(count);
  const actorsLabel =
    actorsMediaLabel === "anh" ? "Người không thích ảnh" : "Người không thích";

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
        mediaLabel={actors.mediaLabel}
      />
    ) : null;

  if (isCoarse) {
    return (
      <>
        <JourneyActionTouchChip
          className={`action-btn${disliked ? " is-disliked" : ""}`}
          ariaLabel={disliked ? "Bỏ không thích" : "Không thích"}
          ariaPressed={disliked}
          disabled={pending}
          onPress={toggle}
          onLongPress={actors ? openActors : undefined}
          longPressHint={actors ? `Giữ để xem ${actorsLabel.toLowerCase()}` : undefined}
        >
          <ThumbsDown
            size={16}
            strokeWidth={1.8}
            fill={disliked ? "currentColor" : "none"}
            aria-hidden
          />
          {showCountChip ? (
            <span className="action-btn-count action-btn-count--static" aria-hidden>
              {displayCount}
            </span>
          ) : null}
        </JourneyActionTouchChip>
        {actorsModal}
      </>
    );
  }

  if (!showCountChip) {
    return (
      <button
        type="button"
        className={`action-btn${disliked ? " is-disliked" : ""}`}
        aria-label={disliked ? "Bỏ không thích" : "Không thích"}
        aria-pressed={disliked}
        disabled={pending}
        onClick={toggle}
      >
        <ThumbsDown
          size={16}
          strokeWidth={1.8}
          fill={disliked ? "currentColor" : "none"}
          aria-hidden
        />
      </button>
    );
  }

  return (
    <span className={`action-btn action-btn--split${disliked ? " is-disliked" : ""}`}>
      <button
        type="button"
        className="action-btn-part action-btn-part--icon"
        aria-label={disliked ? "Bỏ không thích" : "Không thích"}
        aria-pressed={disliked}
        disabled={pending}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
      >
        <ThumbsDown
          size={16}
          strokeWidth={1.8}
          fill={disliked ? "currentColor" : "none"}
          aria-hidden
        />
      </button>
      {actors ? (
        <JourneyActionActorsCount actors={actors} />
      ) : (
        <span className="action-btn-count action-btn-count--static" aria-hidden>
          {displayCount}
        </span>
      )}
    </span>
  );
}
