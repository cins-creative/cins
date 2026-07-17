"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { NgheRolePeopleModal } from "@/components/article/nghe/NgheRolePeopleModal";
import type { NgheRolePerson } from "@/lib/articles/nghe-role-people-types";

/** Số người xem trước trên trang; phần còn lại mở trong bảng danh sách. */
const PREVIEW_LIMIT = 8;

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
      <h2 id="nghe-role-people-title" className="nghe-role-people-title">
        Người trong nghề
      </h2>

      <div className="nghe-role-people-row">
        <ul className="nghe-role-people-list" role="list">
          {preview.map((person, index) => (
            <li key={person.id} className="nghe-role-people-item">
              <JourneyUserPopover
                slug={person.slug}
                fallbackName={person.tenHienThi}
                fallbackAvatarUrl={person.avatarUrl}
              >
                <span
                  className="nghe-role-people-person"
                  aria-label={person.tenHienThi}
                >
                  <PersonAvatar
                    person={person}
                    tone={
                      AVATAR_TONES[index % AVATAR_TONES.length] ?? "av-blue"
                    }
                  />
                </span>
              </JourneyUserPopover>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="nghe-role-people-all"
          aria-label={`Xem tất cả ${countLabel} người trong nghề`}
          title={`Xem tất cả ${countLabel} người`}
          onClick={() => setListOpen(true)}
        >
          <Search size={18} strokeWidth={1.9} aria-hidden />
        </button>
      </div>

      <NgheRolePeopleModal
        open={listOpen}
        onClose={() => setListOpen(false)}
        people={people}
      />
    </section>
  );
}
