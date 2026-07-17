"use client";

import { Loader2, Users, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { JourneySocialActorRow } from "@/components/journey/JourneySocialActorRow";
import type { NgheRolePerson } from "@/lib/articles/nghe-role-people-types";
import type { SocialActorProfile } from "@/lib/social/actors-types";

import "@/components/journey/journey-social-actors.css";

type Props = {
  open: boolean;
  onClose: () => void;
  people: ReadonlyArray<NgheRolePerson>;
};

type EnrichState =
  | { status: "idle" | "loading" }
  | {
      status: "ok";
      actors: SocialActorProfile[];
      viewerId: string | null;
    }
  | { status: "error" };

function personToFallbackActor(person: NgheRolePerson): SocialActorProfile {
  return {
    idNguoiDung: person.id,
    slug: person.slug,
    tenHienThi: person.tenHienThi,
    avatarUrl: person.avatarUrl,
    tuongTacLuc: null,
    bio: null,
    giaiDoan: null,
    tinhThanh: null,
    mutualFriendCount: 0,
    quanHe: "none",
    ketBanId: null,
    dangTheoDoi: false,
  };
}

/** Bảng danh sách đầy đủ — người có vai trò khớp nghề (cùng card social actors). */
export function NgheRolePeopleModal({ open, onClose, people }: Props) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [enrich, setEnrich] = useState<EnrichState>({ status: "idle" });

  const rolesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of people) {
      const roles = person.roles.join(" · ").trim();
      if (roles) map.set(person.id, roles);
    }
    return map;
  }, [people]);

  const peopleIdsKey = useMemo(
    () => people.map((p) => p.id).join("|"),
    [people],
  );

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

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

  useEffect(() => {
    if (!open || people.length === 0) {
      setEnrich({ status: "idle" });
      return;
    }

    let cancelled = false;
    setEnrich({ status: "loading" });

    void (async () => {
      try {
        const response = await fetch("/api/social/actor-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: people.map((p) => p.id) }),
        });
        const json = (await response.json()) as {
          actors?: SocialActorProfile[];
          viewerId?: string | null;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error ?? "Không tải được hồ sơ.");
        }
        if (cancelled) return;

        const byId = new Map(
          (json.actors ?? []).map((actor) => [actor.idNguoiDung, actor]),
        );
        const actors = people.map(
          (person) => byId.get(person.id) ?? personToFallbackActor(person),
        );
        setEnrich({
          status: "ok",
          actors,
          viewerId: json.viewerId ?? null,
        });
      } catch {
        if (cancelled) return;
        setEnrich({ status: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, people, peopleIdsKey]);

  if (!mounted || !open) return null;

  const rows =
    enrich.status === "ok"
      ? enrich.actors
      : people.map(personToFallbackActor);
  const viewerId = enrich.status === "ok" ? enrich.viewerId : null;
  const showList = enrich.status === "ok" || enrich.status === "error";

  return createPortal(
    <div className="jsa-backdrop" role="presentation" onClick={onClose}>
      <div
        className="jsa-modal nghe-role-people-modal"
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
            <strong id={titleId}>Người đang làm công việc này</strong>
            <small>
              {new Intl.NumberFormat("vi-VN").format(people.length)} người
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

        {people.length === 0 ? (
          <p className="jsa-msg">
            <Users size={14} strokeWidth={2} aria-hidden />
            Chưa có ai khớp nghề này.
          </p>
        ) : !showList ? (
          <p className="jsa-msg">
            <Loader2 size={14} strokeWidth={2} className="bc-spin" aria-hidden />
            Đang tải…
          </p>
        ) : (
          <ul className="jsa-list nghe-role-people-modal-list" role="list">
            {rows.map((actor) => (
              <JourneySocialActorRow
                key={actor.idNguoiDung}
                actor={actor}
                viewerId={viewerId}
                subtitleOverride={rolesById.get(actor.idNguoiDung) ?? null}
              />
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
