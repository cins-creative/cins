"use client";

import { Loader2, Users, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { JourneySocialActorRow } from "@/components/journey/JourneySocialActorRow";
import type { CongDongRosterMember } from "@/lib/cong-dong/types";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { SocialActorProfile } from "@/lib/social/actors-types";

import "@/components/journey/journey-social-actors.css";

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  orgLabel: string;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "loadingMore";
      members: CongDongRosterMember[];
      actors: SocialActorProfile[];
      total: number;
      nextOffset: number | null;
      viewerId: string | null;
    }
  | {
      status: "ok";
      members: CongDongRosterMember[];
      actors: SocialActorProfile[];
      total: number;
      nextOffset: number | null;
      viewerId: string | null;
    }
  | { status: "error"; message: string };

function memberToFallbackActor(member: CongDongRosterMember): SocialActorProfile {
  return {
    idNguoiDung: member.id,
    slug: member.slug,
    tenHienThi: member.tenHienThi,
    avatarUrl: member.avatarId ? getAvatarUrl(member.avatarId) : null,
    tuongTacLuc: null,
    bio: null,
    giaiDoan: null,
    tinhThanh: null,
    mutualFriendCount: 0,
    quanHe: "none",
    ketBanId: null,
    dangTheoDoi: false,
    reactionEmoji: null,
  };
}

async function enrichMembers(
  members: CongDongRosterMember[],
): Promise<{ actors: SocialActorProfile[]; viewerId: string | null }> {
  if (members.length === 0) {
    return { actors: [], viewerId: null };
  }

  try {
    const response = await fetch("/api/social/actor-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: members.map((m) => m.id) }),
    });
    const json = (await response.json().catch(() => null)) as {
      actors?: SocialActorProfile[];
      viewerId?: string | null;
      error?: string;
    } | null;

    if (!response.ok) {
      return {
        actors: members.map(memberToFallbackActor),
        viewerId: null,
      };
    }

    const byId = new Map(
      (json?.actors ?? []).map((actor) => [actor.idNguoiDung, actor]),
    );
    return {
      actors: members.map(
        (member) => byId.get(member.id) ?? memberToFallbackActor(member),
      ),
      viewerId: json?.viewerId ?? null,
    };
  } catch {
    return {
      actors: members.map(memberToFallbackActor),
      viewerId: null,
    };
  }
}

export function CongDongRosterModal({
  open,
  onClose,
  orgId,
  orgLabel,
}: Props) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const roleById = useMemo(() => {
    if (state.status !== "ok" && state.status !== "loadingMore") {
      return new Map<string, string>();
    }
    const map = new Map<string, string>();
    for (const member of state.members) {
      map.set(member.id, member.vaiTroLabel);
    }
    return map;
  }, [state]);

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
          setState({
            status: "error",
            message: json?.error ?? "Không tải được danh sách.",
          });
          return;
        }

        const page = json?.members ?? [];
        const total = json?.total ?? page.length;
        const nextOffset =
          typeof json?.nextOffset === "number" ? json.nextOffset : null;
        const enriched = await enrichMembers(page);

        setState((prev) => {
          const prevMembers =
            append && (prev.status === "ok" || prev.status === "loadingMore")
              ? prev.members
              : [];
          const prevActors =
            append && (prev.status === "ok" || prev.status === "loadingMore")
              ? prev.actors
              : [];
          const prevViewer =
            append && (prev.status === "ok" || prev.status === "loadingMore")
              ? prev.viewerId
              : null;

          return {
            status: "ok",
            members: append ? [...prevMembers, ...page] : page,
            actors: append ? [...prevActors, ...enriched.actors] : enriched.actors,
            total,
            nextOffset,
            viewerId: enriched.viewerId ?? prevViewer,
          };
        });
      } catch {
        setState({ status: "error", message: "Lỗi mạng." });
      }
    },
    [orgId],
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
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="jsa-head">
          <span className="jsa-head-ico" aria-hidden>
            <Users size={18} strokeWidth={1.9} />
          </span>
          <div className="jsa-head-copy">
            <strong id={titleId}>Thành viên cộng đồng</strong>
            <small>
              {orgLabel}
              {actorCount != null
                ? ` · ${new Intl.NumberFormat("vi-VN").format(actorCount)} người`
                : null}
            </small>
          </div>
          <button
            type="button"
            className="jsa-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {state.status === "loading" || state.status === "idle" ? (
          <p className="jsa-msg">
            <Loader2
              size={14}
              strokeWidth={2}
              className="cd-v4-members-spin"
              aria-hidden
            />
            Đang tải…
          </p>
        ) : state.status === "error" ? (
          <p className="jsa-msg jsa-msg--err">{state.message}</p>
        ) : state.actors.length === 0 ? (
          <p className="jsa-msg">
            <Users size={14} strokeWidth={2} aria-hidden />
            Chưa có thành viên.
          </p>
        ) : (
          <>
            <ul className="jsa-list" role="list">
              {state.actors.map((actor) => (
                <JourneySocialActorRow
                  key={actor.idNguoiDung}
                  actor={actor}
                  viewerId={viewerId}
                  subtitleOverride={roleById.get(actor.idNguoiDung) ?? null}
                />
              ))}
            </ul>
            {state.nextOffset != null ? (
              <div className="jsa-more-wrap">
                <button
                  type="button"
                  className="jsa-more"
                  disabled={state.status === "loadingMore"}
                  onClick={() => {
                    const offset = state.nextOffset;
                    if (offset == null) return;
                    void loadPage(offset, true);
                  }}
                >
                  {state.status === "loadingMore" ? "Đang tải…" : "Xem thêm"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
