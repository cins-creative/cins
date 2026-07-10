"use client";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import {
  JourneyActionActorsCount,
  type JourneyActionActorsConfig,
} from "@/components/journey/JourneyActionActorsCount";
import { JourneyActionTouchChip } from "@/components/journey/JourneyActionTouchChip";
import type { JourneyActionSheetItem } from "@/components/journey/JourneyActionTouchSheet";
import { JourneySocialActorsModal } from "@/components/journey/JourneySocialActorsModal";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import { sharePostUrl } from "@/lib/journey/share-post-url";
import { useCoarsePointer } from "@/lib/ui/use-coarse-pointer";
import { Heart, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

type Props = {
  milestoneId: string;
  initialLiked?: boolean;
  initialCount?: number;
  showCount?: boolean;
  loaiDoiTuong?: string;
  actorsMediaLabel?: JourneyActionActorsConfig["mediaLabel"];
  disableActorsReveal?: boolean;
  /** Permalink bài — long-press mobile mở chia sẻ. */
  sharePath?: string | null;
  shareTitle?: string | null;
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
  sharePath = null,
  shareTitle = null,
}: Props) {
  const { requireAuth } = useAuthGate();
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
      if (typeof detail.liked === "boolean") setLiked(detail.liked);
      if (typeof detail.likeCount === "number") setCount(detail.likeCount);
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

  const mobileSheetItems = useMemo<JourneyActionSheetItem[]>(() => {
    const items: JourneyActionSheetItem[] = [];
    if (actors) {
      items.push({
        id: "actors",
        label: `${actorsLabel} (${count})`,
        icon: (
          <Heart size={17} strokeWidth={1.8} fill="currentColor" aria-hidden />
        ),
        tone: "liked",
        onSelect: () => setActorsOpen(true),
      });
    }
    items.push({
      id: "toggle",
      label: liked ? "Bỏ thích" : "Thích",
      icon: (
        <Heart
          size={17}
          strokeWidth={1.8}
          fill={liked ? "currentColor" : "none"}
          aria-hidden
        />
      ),
      tone: liked ? "liked" : "default",
      onSelect: toggle,
    });
    if (sharePath?.trim()) {
      items.push({
        id: "share",
        label: "Chia sẻ bài viết",
        icon: <Share2 size={17} strokeWidth={1.8} aria-hidden />,
        onSelect: () => {
          void sharePostUrl(sharePath, shareTitle);
        },
      });
    }
    return items;
  }, [
    actors,
    actorsLabel,
    count,
    liked,
    sharePath,
    shareTitle,
    toggle,
  ]);

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
          className={`action-btn${liked ? " is-liked" : ""}`}
          ariaLabel={liked ? "Bỏ thích" : "Thích"}
          ariaPressed={liked}
          disabled={pending}
          onPress={toggle}
          sheetTitle="Thích"
          sheetItems={mobileSheetItems}
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
