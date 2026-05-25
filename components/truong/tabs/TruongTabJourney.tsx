"use client";

import type { TruongJourneyMember } from "@/lib/truong/types";

const AVATAR_COLORS = [
  "#1F74C9",
  "#5C2BB6",
  "#0E5C3B",
  "#B5610C",
  "#B5446D",
] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "CN";
}

type Props = { members: TruongJourneyMember[] };

export function TruongTabJourney({ members }: Props) {
  return (
    <>
      <div className="sec-hdr">
        <span className="sec-num">06</span>
        <h2 className="sec-title">
          Journey <em>học sinh</em>
        </h2>
      </div>
      {members.length === 0 ? (
        <p className="tdh-placeholder">
          Câu chuyện hướng nghiệp từ học sinh đã/đang học tại trường sẽ hiển thị
          tại đây.
        </p>
      ) : (
        <div className="journey-grid">
          {members.map((m, i) => (
            <div key={m.id} className="journey-card">
              <div
                className="jsav-lg"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                aria-hidden
              >
                {initials(m.displayName)}
              </div>
              <div className="info">
                <div className="nm">{m.displayName}</div>
                <div className="mt">
                  {m.nganhLabel ?? m.vai_tro ?? "Thành viên"}
                  {m.nam_bat_dau ? ` · ${m.nam_bat_dau}` : ""}
                </div>
              </div>
            </div>
          ))}
          {members.length < 3 ? (
            <div className="journey-card-empty">Thêm journey</div>
          ) : null}
        </div>
      )}
    </>
  );
}
