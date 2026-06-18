"use client";

import { Building2, Clock3, Lock, Pencil, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import { useJourneyPersonalFilterOptional } from "@/components/journey/JourneyPersonalFilterContext";
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
      {items.map((item) => {
        const initial = (item.orgTen.charAt(0) || "?").toUpperCase();
        return (
          <article
            key={item.cotMocId}
            className="j-verify-card j-membership-pending"
            data-cot-moc-id={item.cotMocId}
          >
            <div className="j-verify-card-body">
              {item.orgAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.orgAvatarUrl}
                  alt=""
                  className="j-verify-card-avatar"
                />
              ) : (
                <span className="j-verify-card-avatar j-verify-card-avatar--empty">
                  {initial}
                </span>
              )}
              <div className="j-verify-card-copy">
                <p className="j-verify-card-kicker">
                  <ShieldCheck size={14} strokeWidth={2.2} aria-hidden />
                  Cột mốc chờ xác thực
                </p>
                <p className="j-verify-card-lead">
                  <Building2 size={14} strokeWidth={2} aria-hidden />
                  Đã gửi tới <strong>{item.orgTen}</strong>
                </p>
                <p className="j-verify-card-title">{item.title}</p>
                <p className="j-verify-card-note">
                  <Clock3 size={13} strokeWidth={2.2} aria-hidden />
                  Chờ tổ chức duyệt
                  <span className="j-verify-card-note-sep" aria-hidden>
                    ·
                  </span>
                  <Lock size={13} strokeWidth={2.2} aria-hidden />
                  Chỉ bạn thấy
                </p>
              </div>
              <span className="j-verify-card-status">
                <Clock3 size={13} strokeWidth={2.2} aria-hidden />
                Chờ
              </span>
            </div>
            <div className="j-verify-card-actions">
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
            </div>
          </article>
        );
      })}
    </div>
  );
}
