"use client";

import Image from "next/image";

import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { useJourneyPostOverlay } from "@/components/journey/useJourneyPostOverlay";
import type { OrgDoanProjectItem } from "@/lib/journey/org-milestone-tag-types";

const AVATAR_COLORS = [
  "#1F74C9",
  "#5C2BB6",
  "#0E5C3B",
  "#B5610C",
  "#B5446D",
  "#3A4255",
] as const;

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

function DoanStudentMeta({
  item,
  colorIndex,
}: {
  item: OrgDoanProjectItem;
  colorIndex: number;
}) {
  const avatarBg = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  const metaEl = (
    <span className="tdh-doan-gallery-student">
      <span
        className="tdh-doan-gallery-student-avatar"
        style={item.studentAvatarUrl ? undefined : { background: avatarBg }}
        aria-hidden
      >
        {item.studentAvatarUrl ? (
          <Image
            src={item.studentAvatarUrl}
            alt=""
            width={22}
            height={22}
            className="tdh-doan-gallery-student-avatar-img"
          />
        ) : (
          studentInitials(item.studentName)
        )}
      </span>
      <span className="tdh-doan-gallery-student-text">
        <span className="tdh-doan-gallery-student-name">{item.studentName}</span>
        {item.nganhLabel ? (
          <span className="tdh-doan-gallery-student-nganh">{item.nganhLabel}</span>
        ) : null}
      </span>
    </span>
  );

  if (item.studentSlug) {
    return (
      <JourneyUserPopover
        slug={item.studentSlug}
        fallbackName={item.studentName}
        fallbackAvatarUrl={item.studentAvatarUrl}
      >
        {metaEl}
      </JourneyUserPopover>
    );
  }

  return metaEl;
}

function DoanProjectCard({
  item,
  colorIndex,
  onOpen,
}: {
  item: OrgDoanProjectItem;
  colorIndex: number;
  onOpen: (cotMocId: string) => void;
}) {
  const hasImage = Boolean(item.coverSrc);

  return (
    <div className="j-main-gallery-item">
      <button
        type="button"
        className="tdh-doan-gallery-hit"
        onClick={() => onOpen(item.cotMocId)}
        aria-label={`Xem đồ án ${item.projectTitle}`}
      >
        <div
          className="j-main-gallery-thumb"
          style={
            !hasImage && item.coverGradient
              ? { background: item.coverGradient }
              : undefined
          }
        >
          {hasImage ? (
            <Image
              src={item.coverSrc!}
              alt={item.coverAlt ?? item.projectTitle}
              fill
              sizes="(max-width: 575px) 100vw, (max-width: 991px) 50vw, 33vw"
              className="tdh-doan-gallery-img"
            />
          ) : (
            <span className="tdh-doan-gallery-initials" aria-hidden>
              {studentInitials(item.studentName)}
            </span>
          )}
        </div>
        <span className="j-main-gallery-info">
          <strong>{item.projectTitle}</strong>
        </span>
      </button>
      <div className="tdh-doan-gallery-meta">
        <DoanStudentMeta item={item} colorIndex={colorIndex} />
      </div>
    </div>
  );
}

type Props = {
  projects: OrgDoanProjectItem[];
};

export function TruongDoanProjectMasonry({ projects }: Props) {
  const { openPost, overlay } = useJourneyPostOverlay();

  if (!projects.length) return null;

  return (
    <>
      <div className="j-main-gallery-grid tdh-doan-gallery-grid" role="list">
        {projects.map((item, i) => (
          <DoanProjectCard
            key={item.id}
            item={item}
            colorIndex={i}
            onOpen={openPost}
          />
        ))}
      </div>
      {overlay}
    </>
  );
}
