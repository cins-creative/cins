"use client";

import { Pencil } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import { useJourneyPersonalFilterOptional } from "@/components/journey/JourneyPersonalFilterContext";
import { MembershipVerifyCard } from "@/components/journey/MembershipVerifyCard";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  COMPOSE_PUBLISHED_EVENT,
  type ComposePublishedDetail,
} from "@/lib/journey/compose-published-sync";
import type { OutboundMembershipPending } from "@/lib/journey/membership-milestone-types";

type Props = {
  items: ReadonlyArray<OutboundMembershipPending>;
  ownerSlug: string;
};

function fromMilestone(m: MilestoneItem): OutboundMembershipPending | null {
  const pending = m.membershipPending;
  if (!pending || !m.cotMocId) return null;
  return {
    cotMocId: m.cotMocId,
    requestId: pending.requestId,
    title: m.title,
    body: m.body ?? null,
    orgTen: pending.orgTen,
    orgAvatarUrl: pending.orgAvatarUrl,
    orgHref: pending.orgHref,
    submittedAt: pending.submittedAt,
  };
}

export function JourneyMembershipPendingBanner({ items: initialItems, ownerSlug }: Props) {
  const { openCompose, canCompose } = useJourneyCompose();
  const personalFilter = useJourneyPersonalFilterOptional();
  const [items, setItems] = useState<OutboundMembershipPending[]>(() => [
    ...initialItems,
  ]);

  useEffect(() => {
    setItems([...initialItems]);
  }, [initialItems]);

  useEffect(() => {
    const onPublished = (event: Event) => {
      const detail = (event as CustomEvent<ComposePublishedDetail>).detail;
      if (!detail?.ownerSlug || detail.ownerSlug !== ownerSlug) return;
      if (!detail.milestone) return;
      const next = fromMilestone(detail.milestone);
      if (!next) return;
      setItems((prev) => {
        const idx = prev.findIndex((p) => p.cotMocId === next.cotMocId);
        if (idx >= 0) {
          return prev.map((p, i) => (i === idx ? { ...p, ...next } : p));
        }
        return [next, ...prev];
      });
    };
    window.addEventListener(COMPOSE_PUBLISHED_EVENT, onPublished);
    return () => window.removeEventListener(COMPOSE_PUBLISHED_EVENT, onPublished);
  }, [ownerSlug]);

  const scrollToCard = useCallback(
    (cotMocId: string) => {
      const selector = `.j-milestone[data-mid="${cotMocId}"], .j-milestone[data-mid="${CSS.escape(cotMocId)}"]`;
      let el = document.querySelector<HTMLElement>(selector);
      if (!el && personalFilter?.activeSlug) {
        personalFilter.setActiveSlug(null);
        window.setTimeout(() => {
          el = document.querySelector<HTMLElement>(selector);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 120);
        return;
      }
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [personalFilter],
  );

  if (items.length === 0) return null;

  return (
    <div className="j-membership-pending-stack" aria-live="polite">
      {items.map((item) => (
        <MembershipVerifyCard
          key={item.cotMocId}
          variant="pending"
          cotMocId={item.cotMocId}
          orgName={item.orgTen}
          orgAvatarUrl={item.orgAvatarUrl}
          title={item.title}
          actions={
            <>
              <button
                type="button"
                className="j-verify-card-btn is-view"
                onClick={() => scrollToCard(item.cotMocId)}
              >
                Xem trên timeline
              </button>
              {canCompose ? (
                <button
                  type="button"
                  className="j-verify-card-btn is-edit"
                  onClick={() =>
                    openCompose({ kind: "milestone-edit", cotMocId: item.cotMocId })
                  }
                >
                  <Pencil size={14} strokeWidth={2} aria-hidden />
                  Chỉnh sửa
                </button>
              ) : null}
            </>
          }
        />
      ))}
    </div>
  );
}
