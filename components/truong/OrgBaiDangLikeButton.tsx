"use client";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { Heart } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { SOCIAL_LOAI_ORG_BAI_DANG } from "@/lib/truong/social-constants";

type Props = {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
};

export function OrgBaiDangLikeButton({
  postId,
  initialLiked = false,
  initialCount = 0,
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
  }, [initialLiked, initialCount, postId]);

  const toggle = () => {
    requireAuth(() => {
      const nextLiked = !liked;
      const nextCount = Math.max(0, count + (nextLiked ? 1 : -1));
      setLiked(nextLiked);
      setCount(nextCount);
      startTransition(async () => {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai_doi_tuong: SOCIAL_LOAI_ORG_BAI_DANG,
            id_doi_tuong: postId,
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
        setLiked(Boolean(json.liked));
        setCount(Number(json.count ?? nextCount));
      });
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
      {count > 0 ? <span>{count}</span> : null}
    </button>
  );
}
