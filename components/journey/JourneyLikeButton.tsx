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
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

type Props = {
  milestoneId: string;
  initialLiked?: boolean;
  initialCount?: number;
  showCount?: boolean;
  loaiDoiTuong?: string;
  actorsMediaLabel?: JourneyActionActorsConfig["mediaLabel"];
  disableActorsReveal?: boolean;
  /** Permalink bài — giữ cho API tương thích; chia sẻ không còn gắn long-press. */
  sharePath?: string | null;
  shareTitle?: string | null;
};

type SocialEvent = CustomEvent<{
  milestoneId: string;
  liked?: boolean;
  likeCount?: number;
  disliked?: boolean;
  dislikeCount?: number;
  bookmarked?: boolean;
  bookmarkCount?: number;
}>;

export function JourneyLikeButton({
  milestoneId,
  initialLiked = false,
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
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const [actorsOpen, setActorsOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setLiked(initialLiked);
      setCount(initialCount);
    });
  }, [initialLiked, initialCount]);

  useEffect(() => {
    const onSocial = (event: Event) => {
      const detail = (event as SocialEvent).detail;
      if (detail.milestoneId !== milestoneId) return;
      if (typeof detail.likeCount === "number") setCount(detail.likeCount);
      if (detail.disliked === true) {
        setLiked((prev) => {
          if (prev && typeof detail.likeCount !== "number") {
            setCount((c) => Math.max(0, c - 1));
          }
          return false;
        });
        return;
      }
      if (typeof detail.liked === "boolean") setLiked(detail.liked);
    };
    window.addEventListener("cins:social-action", onSocial);
    return () => window.removeEventListener("cins:social-action", onSocial);
  }, [milestoneId]);

  const toggle = useCallback(() => {
    requireAuth(() => {
      const nextLiked = !liked;
      const nextCount = Math.max(0, count + (nextLiked ? 1 : -1));
      setLiked(nextLiked);
      setCount(nextCount);
      window.dispatchEvent(
        new CustomEvent("cins:social-action", {
          detail: {
            milestoneId,
            liked: nextLiked,
            likeCount: nextCount,
            ...(nextLiked ? { disliked: false } : {}),
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
            emoji: REACTION_EMOJI.LIKE,
            active: nextLiked,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) return;
          setLiked(liked);
          setCount(count);
          return;
        }
        const syncedLiked = Boolean(json.liked);
        const syncedCount = Number(json.likeCount ?? json.count ?? nextCount);
        const syncedDisliked = Boolean(json.disliked);
        const syncedDislikeCount =
          typeof json.dislikeCount === "number" ? json.dislikeCount : undefined;
        setLiked(syncedLiked);
        setCount(syncedCount);
        window.dispatchEvent(
          new CustomEvent("cins:social-action", {
            detail: {
              milestoneId,
              liked: syncedLiked,
              likeCount: syncedCount,
              disliked: syncedDisliked,
              ...(syncedDislikeCount !== undefined
                ? { dislikeCount: syncedDislikeCount }
                : {}),
            },
          }),
        );
      });
    });
  }, [count, liked, loaiDoiTuong, milestoneId, requireAuth]);

  const actors = useMemo<JourneyActionActorsConfig | null>(() => {
    if (disableActorsReveal || count <= 0) return null;
    return {
      kind: "like",
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
  const actorsLabel =
    actorsMediaLabel === "anh" ? "Người thích ảnh" : "Người thích";

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
        emoji={actors.emoji}
      />
    ) : null;

  if (isCoarse) {
    return (
      <>
        <JourneyActionTouchChip
          className={`action-btn${liked ? " is-liked" : ""}`}
          ariaLabel={liked ? "Bỏ thích" : "Thích"}
          ariaPressed={liked}
          disabled={pending}
          onPress={toggle}
          onLongPress={actors ? openActors : undefined}
          longPressHint={actors ? `Giữ để xem ${actorsLabel.toLowerCase()}` : undefined}
        >
          <Heart
            size={16}
            strokeWidth={1.8}
            fill={liked ? "currentColor" : "none"}
            aria-hidden
          />
          {showCountChip ? (
            <span className="action-btn-count action-btn-count--static" aria-hidden>
              {count}
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
        className={`action-btn${liked ? " is-liked" : ""}`}
        aria-label={liked ? "Bỏ thích" : "Thích"}
        aria-pressed={liked}
        disabled={pending}
        onClick={toggle}
      >
        <Heart size={16} strokeWidth={1.8} fill={liked ? "currentColor" : "none"} aria-hidden />
      </button>
    );
  }

  return (
    <span className={`action-btn action-btn--split${liked ? " is-liked" : ""}`}>
      <button
        type="button"
        className="action-btn-part action-btn-part--icon"
        aria-label={liked ? "Bỏ thích" : "Thích"}
        aria-pressed={liked}
        disabled={pending}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
      >
        <Heart size={16} strokeWidth={1.8} fill={liked ? "currentColor" : "none"} aria-hidden />
      </button>
      {actors ? (
        <JourneyActionActorsCount actors={actors} />
      ) : (
        <span className="action-btn-count action-btn-count--static" aria-hidden>
          {count}
        </span>
      )}
    </span>
  );
}
