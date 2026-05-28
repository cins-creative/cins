"use client";

import { Heart } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

type Props = {
  milestoneId: string;
  initialLiked?: boolean;
  initialCount?: number;
  showCount?: boolean;
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
}: Props) {
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
          loai_doi_tuong: "cot_moc",
          id_doi_tuong: milestoneId,
          emoji: "heart",
          active: nextLiked,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
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
  };

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
      {showCount && count > 0 ? <span>{count}</span> : null}
    </button>
  );
}
