"use client";

import { useState } from "react";

import { AuthorRoleTooltip } from "@/components/journey/AuthorRoleTooltip";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { NgheRolePeopleModal } from "@/components/article/nghe/NgheRolePeopleModal";
import type { NgheRolePerson } from "@/lib/articles/nghe-role-people-types";

/** Số người xem trước trên trang; phần còn lại mở trong bảng danh sách. */
const PREVIEW_LIMIT = 4;

const AVATAR_TONES = [
  "av-blue",
  "av-green",
  "av-amber",
  "av-purple",
  "av-coral",
] as const;

type Props = {
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

/** Danh sách người có vai trò khớp bài nghề — dưới hero. */
export function NgheRolePeopleSection({ people }: Props) {
  const [listOpen, setListOpen] = useState(false);

  if (people.length === 0) return null;

  const preview = people.slice(0, PREVIEW_LIMIT);
  const countLabel = new Intl.NumberFormat("vi-VN").format(people.length);

  return (
    <section
      className="nghe-role-people"
      aria-labelledby="nghe-role-people-title"
    >
      <div className="nghe-role-people-head">
        <h2 id="nghe-role-people-title" className="nghe-role-people-title">
          Những người đang làm nghề này
        </h2>
        <span className="nghe-role-people-count">{countLabel} người</span>
      </div>

      <ul className="nghe-role-people-list" role="list">
        {preview.map((person, index) => (
          <li key={person.id} className="nghe-role-people-item author-row-item">
            <JourneyUserPopover
              slug={person.slug}
              fallbackName={person.tenHienThi}
              fallbackAvatarUrl={person.avatarUrl}
            >
              <span className="author-row-person">
                <PersonAvatar
                  person={person}
                  tone={
                    AVATAR_TONES[index % AVATAR_TONES.length] ?? "av-blue"
                  }
                />
                <span className="author-row-info author-row-inline">
                  <span className="author-row-name">{person.tenHienThi}</span>
                  {person.roles.map((role) => (
                    <AuthorRoleTooltip key={role} role={role} />
                  ))}
                </span>
              </span>
            </JourneyUserPopover>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="nghe-role-people-all"
        onClick={() => setListOpen(true)}
      >
        Xem tất cả người làm công việc này
        {people.length > PREVIEW_LIMIT ? (
          <span className="nghe-role-people-all-count">({countLabel})</span>
        ) : null}
      </button>

      <NgheRolePeopleModal
        open={listOpen}
        onClose={() => setListOpen(false)}
        people={people}
      />
    </section>
  );
}
