"use client";

import Image from "next/image";
import Link from "next/link";

import type { TruongDoanProjectItem } from "@/lib/truong/doan-project-mock";

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

function DoanProjectCard({
  item,
  colorIndex,
}: {
  item: TruongDoanProjectItem;
  colorIndex: number;
}) {
  const hasImage = Boolean(item.coverSrc);
  const avatarBg = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];

  return (
    <article className={`tdh-doan-card tdh-doan-card--${item.tile}`}>
      <Link href={item.href} className="tdh-doan-card__link">
        <div
          className={`tdh-doan-card__cover tdh-doan-card__cover--${item.tile}`}
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
              sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
              className="tdh-doan-card__img"
            />
          ) : (
            <span className="tdh-doan-card__initials" aria-hidden>
              {studentInitials(item.studentName)}
            </span>
          )}
          {item.photoCount != null && item.photoCount > 0 ? (
            <span className="tdh-doan-card__count">{item.photoCount} ảnh</span>
          ) : null}
        </div>
        <div className="tdh-doan-card__body">
          <p className="tdh-doan-card__title">{item.projectTitle}</p>
          <div className="tdh-doan-card__meta">
            <span
              className="tdh-doan-card__avatar"
              style={{ background: avatarBg }}
              aria-hidden
            >
              {studentInitials(item.studentName)}
            </span>
            <span className="tdh-doan-card__who">
              <span className="tdh-doan-card__name">{item.studentName}</span>
              {item.nganhLabel ? (
                <span className="tdh-doan-card__nganh">{item.nganhLabel}</span>
              ) : null}
            </span>
          </div>
          <p className="tdh-doan-card__milestone">{item.milestoneTitle}</p>
        </div>
      </Link>
    </article>
  );
}

type Props = {
  projects: TruongDoanProjectItem[];
};

export function TruongDoanProjectMasonry({ projects }: Props) {
  if (!projects.length) return null;

  return (
    <div className="tdh-doan-masonry" role="list">
      {projects.map((item, i) => (
        <DoanProjectCard key={item.id} item={item} colorIndex={i} />
      ))}
    </div>
  );
}
