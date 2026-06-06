"use client";

import { UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { CoAuthorSection } from "@/components/editor/CoAuthorSection";
import { dispatchMilestoneCreditsUpdated } from "@/lib/journey/coauthor-credits-events";
import type { CoAuthorDraft } from "@/lib/social/types";
import type { CoAuthorCredit } from "@/components/journey/milestone-types";

type Props = {
  tacPhamId: string;
  mode: "owner" | "proposal";
  /** Chủ Journey — loại khỏi danh sách tìm cộng sự. */
  ownerId?: string;
};

export function JourneyCoAuthorProposal({
  tacPhamId,
  mode,
  ownerId = "",
}: Props) {
  const headingId = useId();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<CoAuthorDraft[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isOwnerMode = mode === "owner";
  const title = isOwnerMode ? "Quản lý cộng sự" : "Đề xuất cộng sự";
  const helperText = isOwnerMode
    ? "Người được thêm sẽ nhận lời mời cộng sự cho bài viết này."
    : "Đề xuất sẽ được gửi cho chủ bài viết duyệt trước khi mời cộng sự.";
  const submitLabel = isOwnerMode ? "Gửi lời mời" : "Gửi đề xuất";

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setCollaborators([]);
    setMessage(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const submit = () => {
    if (collaborators.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      for (const item of collaborators) {
        const res = await fetch(`/api/tac-pham/${tacPhamId}/tac-gia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_nguoi_dung: item.idNguoiDung,
            vai_tro: item.vaiTro.trim(),
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(
            typeof json.error === "string"
              ? json.error
              : "Không gửi được yêu cầu cộng sự.",
          );
          return;
        }
        if (
          isOwnerMode &&
          Array.isArray(json.coAuthorCredits) &&
          typeof json.tacPhamId === "string"
        ) {
          dispatchMilestoneCreditsUpdated({
            tacPhamId: json.tacPhamId,
            coAuthorCredits: json.coAuthorCredits as CoAuthorCredit[],
          });
        }
      }
      setMessage(
        isOwnerMode
          ? "Đã gửi lời mời cộng sự."
          : "Đã gửi đề xuất cho chủ bài viết duyệt.",
      );
      setCollaborators([]);
    });
  };

  const modal = open ? (
    <div
      className="ed-coauthor-modal-backdrop"
      role="presentation"
      onClick={close}
    >
      <div
        className="ed-coauthor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="ed-coauthor-modal-close"
          aria-label="Đóng"
          onClick={close}
        >
          <X size={16} aria-hidden />
        </button>
        <h2 id={headingId} className="ed-coauthor-sr-only">
          {title}
        </h2>
        <CoAuthorSection
          ownerId={ownerId}
          collaborators={collaborators}
          ownerVaiTro=""
          onCollaboratorsChange={setCollaborators}
          onOwnerVaiTroChange={() => {}}
        />
        {message ? (
          <p className="ed-coauthor-hint ed-coauthor-modal-feedback">{message}</p>
        ) : null}
        <div className="ed-coauthor-modal-actions">
          <span>{helperText}</span>
          <button
            type="button"
            className="ed-coauthor-save"
            disabled={collaborators.length === 0 || pending}
            onClick={submit}
          >
            {pending ? "Đang gửi…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="j-coauthor-propose" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="j-coauthor-propose-trigger"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label={title}
        title={title}
      >
        <UserPlus size={15} strokeWidth={2} aria-hidden />
      </button>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </div>
  );
}
