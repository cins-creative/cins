"use client";

import { UserPlus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { CoAuthorSection } from "@/components/editor/CoAuthorSection";
import { dispatchMilestoneCreditsUpdated } from "@/lib/journey/coauthor-credits-events";
import type { CoAuthorDraft, CoAuthorPersisted } from "@/lib/social/types";
import type { CoAuthorCredit } from "@/components/journey/milestone-types";

type Props = {
  tacPhamId: string;
  mode: "owner" | "proposal";
  /** Chủ Journey — loại khỏi danh sách tìm cộng sự. */
  ownerId?: string;
};

function persistedToDraft(rows: CoAuthorPersisted[]): CoAuthorDraft[] {
  return rows
    .filter((r) => !r.laChuSoHuu)
    .map((r) => ({
      idNguoiDung: r.idNguoiDung,
      slug: r.slug,
      tenHienThi: r.tenHienThi,
      avatarId: r.avatarId ?? null,
      vaiTro: r.vaiTro,
    }));
}

export function JourneyCoAuthorProposal({
  tacPhamId,
  mode,
  ownerId = "",
}: Props) {
  const headingId = useId();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<CoAuthorDraft[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isOwnerMode = mode === "owner";
  const title = isOwnerMode ? "Quản lý cộng sự" : "Đề xuất cộng sự";
  const helperText = isOwnerMode
    ? "Thêm hoặc bỏ cộng sự — người mới sẽ nhận lời mời."
    : "Đề xuất sẽ được gửi cho chủ bài viết duyệt trước khi mời cộng sự.";
  const submitLabel = isOwnerMode ? "Lưu" : "Gửi đề xuất";

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setCollaborators([]);
    setMessage(null);
  }, []);

  const loadExisting = useCallback(async () => {
    setLoadingList(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/tac-pham/${tacPhamId}/tac-gia`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(
          typeof json.error === "string"
            ? json.error
            : "Không tải được danh sách cộng sự.",
        );
        setCollaborators([]);
        return;
      }
      const rows = (json.tac_gia ?? []) as CoAuthorPersisted[];
      setCollaborators(persistedToDraft(rows));
    } catch {
      setMessage("Lỗi mạng khi tải cộng sự.");
      setCollaborators([]);
    } finally {
      setLoadingList(false);
    }
  }, [tacPhamId]);

  const openModal = useCallback(() => {
    setOpen(true);
    if (isOwnerMode) void loadExisting();
  }, [isOwnerMode, loadExisting]);

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

  const submitOwner = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/tac-pham/${tacPhamId}/tac-gia`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collaborators }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(
          typeof json.error === "string"
            ? json.error
            : "Không lưu được danh sách cộng sự.",
        );
        return;
      }
      if (
        Array.isArray(json.coAuthorCredits) &&
        typeof json.tacPhamId === "string"
      ) {
        dispatchMilestoneCreditsUpdated({
          tacPhamId: json.tacPhamId,
          coAuthorCredits: json.coAuthorCredits as CoAuthorCredit[],
        });
      }
      setMessage("Đã lưu cộng sự.");
      close();
    });
  };

  const submitProposal = () => {
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
      }
      setMessage("Đã gửi đề xuất cho chủ bài viết duyệt.");
      setCollaborators([]);
      close();
    });
  };

  const submit = () => {
    if (isOwnerMode) submitOwner();
    else submitProposal();
  };

  const canSubmit = isOwnerMode
    ? !loadingList && !pending
    : collaborators.length > 0 && !pending;

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
        {loadingList ? (
          <p className="ed-coauthor-hint">Đang tải cộng sự hiện có…</p>
        ) : (
          <CoAuthorSection
            key={isOwnerMode ? `owner-${tacPhamId}-${open}` : "proposal"}
            ownerId={ownerId}
            collaborators={collaborators}
            ownerVaiTro=""
            onCollaboratorsChange={setCollaborators}
            onOwnerVaiTroChange={() => {}}
            initialPickerOpen={isOwnerMode}
          />
        )}
        {message ? (
          <p className="ed-coauthor-hint ed-coauthor-modal-feedback">{message}</p>
        ) : null}
        <div className="ed-coauthor-modal-actions">
          <span>{helperText}</span>
          <button
            type="button"
            className="ed-coauthor-save"
            disabled={!canSubmit}
            onClick={submit}
          >
            {pending ? "Đang lưu…" : submitLabel}
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
        onClick={openModal}
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
