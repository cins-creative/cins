"use client";

import { Bookmark, Heart, MessageCircle, ThumbsDown, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { JourneySocialActorRow } from "@/components/journey/JourneySocialActorRow";
import type {
  SocialActorProfile,
  SocialInteractionKind,
} from "@/lib/social/actors-types";

import "./journey-social-actors.css";

type Props = {
  open: boolean;
  onClose: () => void;
  kind: SocialInteractionKind;
  loaiDoiTuong: string;
  idDoiTuong: string;
  /** Nhãn phụ — ví dụ "ảnh" cho like trên card media. */
  mediaLabel?: "anh" | "bai";
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "loadingMore";
      actors: SocialActorProfile[];
      total: number;
      hasMore: boolean;
      viewerId: string | null;
    }
  | {
      status: "ok";
      actors: SocialActorProfile[];
      total: number;
      hasMore: boolean;
      viewerId: string | null;
    }
  | { status: "error"; message: string };

function modalTitle(kind: SocialInteractionKind, mediaLabel?: "anh" | "bai"): string {
  if (kind === "like") {
    return mediaLabel === "anh" ? "Người thích ảnh" : "Người thích";
  }
  if (kind === "dislike") {
    return mediaLabel === "anh" ? "Người không thích ảnh" : "Người không thích";
  }
  if (kind === "comment") return "Người bình luận";
  return "Người đã lưu";
}

function modalHeadIcon(kind: SocialInteractionKind) {
  if (kind === "like") {
    return (
      <Heart
        size={18}
        strokeWidth={1.8}
        fill="currentColor"
        aria-hidden
      />
    );
  }
  if (kind === "dislike") {
    return (
      <ThumbsDown
        size={18}
        strokeWidth={1.8}
        fill="currentColor"
        aria-hidden
      />
    );
  }
  if (kind === "comment") {
    return <MessageCircle size={18} strokeWidth={1.9} aria-hidden />;
  }
  return <Bookmark size={18} strokeWidth={1.9} aria-hidden />;
}

function headIconClass(kind: SocialInteractionKind): string {
  if (kind === "like") return "jsa-head-ico is-liked";
  if (kind === "dislike") return "jsa-head-ico is-disliked";
  if (kind === "comment") return "jsa-head-ico is-comment";
  return "jsa-head-ico is-bookmark";
}

export function JourneySocialActorsModal({
  open,
  onClose,
  kind,
  loaiDoiTuong,
  idDoiTuong,
  mediaLabel,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      if (append) {
        setState((prev) =>
          prev.status === "ok"
            ? { ...prev, status: "loadingMore" }
            : { status: "loading" },
        );
      } else {
        setState({ status: "loading" });
      }

      const qs = new URLSearchParams({
        kind,
        loai_doi_tuong: loaiDoiTuong,
        id_doi_tuong: idDoiTuong,
        offset: String(offset),
      });

      try {
        const res = await fetch(`/api/social/actors?${qs.toString()}`);
        const json = (await res.json().catch(() => null)) as {
          actors?: SocialActorProfile[];
          total?: number;
          hasMore?: boolean;
          viewerId?: string | null;
          error?: string;
        } | null;

        if (!res.ok) {
          setState({
            status: "error",
            message: json?.error ?? "Không tải được danh sách.",
          });
          return;
        }

        const actors = json?.actors ?? [];
        const total = json?.total ?? actors.length;
        const hasMore = Boolean(json?.hasMore);
        const viewerId = json?.viewerId ?? null;

        setState((prev) => {
          const prevActors =
            prev.status === "ok" || prev.status === "loadingMore"
              ? prev.actors
              : [];
          const merged = append ? [...prevActors, ...actors] : actors;
          return { status: "ok", actors: merged, total, hasMore, viewerId };
        });
      } catch {
        setState({ status: "error", message: "Lỗi mạng." });
      }
    },
    [kind, loaiDoiTuong, idDoiTuong],
  );

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => setState({ status: "idle" }));
      return;
    }
    void loadPage(0, false);
  }, [open, loadPage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const title = modalTitle(kind, mediaLabel);
  const actorCount =
    state.status === "ok" || state.status === "loadingMore" ? state.total : null;
  const viewerId =
    state.status === "ok" || state.status === "loadingMore"
      ? state.viewerId
      : null;

  return createPortal(
    <div className="jsa-backdrop" role="presentation" onClick={onClose}>
      <div
        className="jsa-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="jsa-head">
          <span className={headIconClass(kind)} aria-hidden>
            {modalHeadIcon(kind)}
          </span>
          <div className="jsa-head-copy">
            <strong>{title}</strong>
            {actorCount != null ? (
              <small>
                {new Intl.NumberFormat("vi-VN").format(actorCount)} người
              </small>
            ) : null}
          </div>
          <button type="button" className="jsa-close" aria-label="Đóng" onClick={onClose}>
            <X size={16} aria-hidden />
          </button>
        </div>

        {state.status === "loading" ? (
          <p className="jsa-msg">Đang tải…</p>
        ) : state.status === "error" ? (
          <p className="jsa-msg jsa-msg--err">{state.message}</p>
        ) : state.status === "ok" || state.status === "loadingMore" ? (
          state.actors.length === 0 ? (
            <p className="jsa-msg">
              <Users size={14} strokeWidth={2} aria-hidden />
              Chưa có ai tương tác.
            </p>
          ) : (
            <>
              <ul className="jsa-list" role="list">
                {state.actors.map((actor) => (
                  <JourneySocialActorRow
                    key={actor.idNguoiDung}
                    actor={actor}
                    viewerId={viewerId}
                    kind={kind}
                    onNavigate={onClose}
                  />
                ))}
              </ul>
              {state.hasMore ? (
                <div className="jsa-more-wrap">
                  <button
                    type="button"
                    className="jsa-more"
                    disabled={state.status === "loadingMore"}
                    onClick={() => void loadPage(state.actors.length, true)}
                  >
                    {state.status === "loadingMore" ? "Đang tải…" : "Xem thêm"}
                  </button>
                </div>
              ) : null}
            </>
          )
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
