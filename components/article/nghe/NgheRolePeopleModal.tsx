"use client";

import { Users, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { AuthorRoleTooltip } from "@/components/journey/AuthorRoleTooltip";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import type { NgheRolePerson } from "@/lib/articles/nghe-role-people-types";

import "@/components/journey/journey-social-actors.css";

const AVATAR_TONES = [
  "av-blue",
  "av-green",
  "av-amber",
  "av-purple",
  "av-coral",
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  people: ReadonlyArray<NgheRolePerson>;
};

function PersonAvatar({
  person,
  tone,
}: {
  person: NgheRolePerson;
  tone: string;
}) {
  const initial = (person.tenHienThi || person.slug || "?").slice(0, 1).toUpperCase();
  return (
    <span className={`av ${tone}`}>
      {person.avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={person.avatarUrl} alt="" />
      ) : (
        initial
      )}
    </span>
  );
}

/** Bảng danh sách đầy đủ — người có vai trò khớp nghề. */
export function NgheRolePeopleModal({ open, onClose, people }: Props) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

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

  if (!mounted || !open) return null;

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
        ) : (
          <ul className="jsa-list nghe-role-people-modal-list" role="list">
            {people.map((person, index) => (
              <li key={person.id} className="jsa-row">
                <div className="jsa-item nghe-role-people-modal-item">
                  <JourneyUserPopover
                    slug={person.slug}
                    fallbackName={person.tenHienThi}
                    fallbackAvatarUrl={person.avatarUrl}
                    backdropZIndex={10950}
                  >
                    <span className="nghe-role-people-modal-person">
                      <PersonAvatar
                        person={person}
                        tone={
                          AVATAR_TONES[index % AVATAR_TONES.length] ?? "av-blue"
                        }
                      />
                      <span className="nghe-role-people-modal-meta">
                        <span className="nghe-role-people-modal-name">
                          {person.tenHienThi}
                        </span>
                        <span className="nghe-role-people-modal-roles">
                          {person.roles.map((role) => (
                            <AuthorRoleTooltip key={role} role={role} />
                          ))}
                        </span>
                      </span>
                    </span>
                  </JourneyUserPopover>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
