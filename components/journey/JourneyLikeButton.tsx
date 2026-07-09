"use client";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import {
  JourneyActionActorsCount,
  type JourneyActionActorsConfig,
} from "@/components/journey/JourneyActionActorsCount";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import { Heart } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

type Props = {
  milestoneId: string;
  initialLiked?: boolean;
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
  const { requireAuth } = useAuthGate();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

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
      if (typeof detail.liked === "boolean") setLiked(detail.liked);
      if (typeof detail.likeCount === "number") setCount(detail.likeCount);
    };
    window.addEventListener("cins:social-action", onSocial);
    return () => window.removeEventListener("cins:social-action", onSocial);
  }, [milestoneId]);

  const toggle = () => {
    requireAuth(() => {
      const nextLiked = !liked;
      const nextCount = Math.max(0, count + (nextLiked ? 1 : -1));
      setLiked(nextLiked);
      setCount(nextCount);
      window.dispatchEvent(
        new CustomEvent("cins:social-action", {
          detail: { milestoneId, liked: nextLiked, likeCount: nextCount },
        }),
      );
      startTransition(async () => {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai_doi_tuong: loaiDoiTuong,
            id_doi_tuong: milestoneId,
            emoji: "heart",
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
        const syncedCount = Number(json.count ?? nextCount);
        setLiked(syncedLiked);
        setCount(syncedCount);
        window.dispatchEvent(
          new CustomEvent("cins:social-action", {
            detail: { milestoneId, liked: syncedLiked, likeCount: syncedCount },
          }),
        );
      });
    });
  };

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
      {showCountChip ? (
        actors ? (
          <JourneyActionActorsCount actors={actors} />
        ) : (
          <span className="action-btn-count action-btn-count--static" aria-hidden>
            {count}
          </span>
        )
      ) : null}
    </span>
  );
}
