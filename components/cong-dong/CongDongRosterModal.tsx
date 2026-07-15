"use client";

import { Loader2, Users, X } from "lucide-react";
import { useCallback, useEffect, useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import type { CongDongRosterMember } from "@/lib/cong-dong/types";
import { getAvatarUrl } from "@/lib/journey/profile";

const ROSTER_POPOVER_Z = 10600;

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  orgLabel: string;
};

function MemberAvatar({
  avatarId,
  name,
}: {
  avatarId: string | null;
  name: string;
}) {
  const src = avatarId ? getAvatarUrl(avatarId) : null;
  return (
    <span className="cd-v4-members-avatar" aria-hidden>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" />
      ) : (
        <span>{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

export function CongDongRosterModal({
  open,
  onClose,
  orgId,
  orgLabel,
}: Props) {
  const titleId = useId();
  const [members, setMembers] = useState<CongDongRosterMember[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadMorePending, startLoadMore] = useTransition();

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      if (!append) setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/cong-dong/${orgId}/roster?offset=${offset}`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => null)) as {
          members?: CongDongRosterMember[];
          total?: number;
          nextOffset?: number | null;
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? "Không tải được danh sách.");
          if (!append) {
            setMembers([]);
            setTotal(0);
            setNextOffset(null);
          }
          return;
        }
        const page = json?.members ?? [];
        setMembers((prev) => (append ? [...prev, ...page] : page));
        setTotal(json?.total ?? page.length);
        setNextOffset(
          typeof json?.nextOffset === "number" ? json.nextOffset : null,
        );
      } finally {
        if (!append) setLoading(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    if (!open) return;
    void loadPage(0, false);
  }, [open, loadPage]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="cd-v4-members-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="cd-v4-members-modal cd-v4-roster-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cd-v4-members-head">
          <div className="cd-v4-members-head-copy">
            <span className="cd-v4-members-head-icon" aria-hidden>
              <Users size={18} strokeWidth={2} />
            </span>
            <div className="cd-v4-members-head-text">
              <h2 id={titleId}>Thành viên cộng đồng</h2>
              <p className="cd-v4-members-head-sub">
                {orgLabel}
                {total > 0 ? ` · ${total} người` : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cd-v4-members-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="cd-v4-members-body">
          {err ? (
            <p className="cd-v4-members-err" role="alert">
              {err}
            </p>
          ) : null}

          <section className="cd-v4-members-panel cd-v4-members-panel--list">
            <div className="cd-v4-members-list-scroll">
              {loading ? (
                <p className="cd-v4-members-muted">
                  <Loader2
                    size={14}
                    strokeWidth={2}
                    className="cd-v4-members-spin"
                    aria-hidden
                  />
                  Đang tải…
                </p>
              ) : members.length === 0 ? (
                <p className="cd-v4-members-empty">Chưa có thành viên.</p>
              ) : (
                <ul className="cd-v4-members-list">
                  {members.map((member) => (
                    <li key={member.id}>
                      <div className="cd-v4-members-row-copy">
                        <JourneyUserPopover
                          slug={member.slug}
                          fallbackName={member.tenHienThi}
                          fallbackAvatarUrl={
                            member.avatarId
                              ? getAvatarUrl(member.avatarId)
                              : null
                          }
                          backdropZIndex={ROSTER_POPOVER_Z}
                        >
                          <span className="cd-v4-members-row-trigger">
                            <MemberAvatar
                              avatarId={member.avatarId}
                              name={member.tenHienThi}
                            />
                            <div className="cd-v4-members-row-text">
                              <strong>{member.tenHienThi}</strong>
                              <span className="cd-v4-members-muted">
                                {member.vaiTroLabel}
                              </span>
                            </div>
                          </span>
                        </JourneyUserPopover>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {nextOffset != null ? (
              <button
                type="button"
                className="cd-v4-roster-more"
                disabled={loadMorePending}
                onClick={() =>
                  startLoadMore(() => {
                    void loadPage(nextOffset, true);
                  })
                }
              >
                {loadMorePending ? "Đang tải…" : "Xem thêm"}
              </button>
            ) : null}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
