"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { getCoverUrl } from "@/lib/articles/cover";
import type { NgheNganhRow } from "@/lib/nganh/queries";

const JOB_THUMB_TONES = [
  "tone-yellow",
  "tone-mint",
  "tone-orange",
  "tone-violet",
] as const;

const JOBS_INITIAL = 6;

function ngheCareerHref(slug: string): string {
  return `/huong-nghiep/nghe/${encodeURIComponent(slug)}`;
}

function ngheLabel(row: NgheNganhRow): string {
  return (row.tieu_de_viet ?? row.tieu_de).trim();
}

function ngheThumbInitials(title: string): string {
  const w = title.split(/\s+/).filter(Boolean);
  if (w.length >= 2) {
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  }
  return title.slice(0, 2).toUpperCase() || "NG";
}

function ngheShortDesc(row: NgheNganhRow): string | null {
  const t = row.tom_tat?.trim();
  if (!t) return null;
  return t.length > 120 ? `${t.slice(0, 117)}…` : t;
}

type Props = {
  items: NgheNganhRow[];
};

export function NctJobsGrid({ items }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > JOBS_INITIAL;
  const visible = expanded ? items : items.slice(0, JOBS_INITIAL);
  const hiddenCount = items.length - JOBS_INITIAL;

  return (
    <div className="nct-jobs-grid">
      {visible.map((row, i) => (
        <NgheJobCard
          key={row.id}
          row={row}
          href={ngheCareerHref(row.slug)}
          tone={JOB_THUMB_TONES[i % JOB_THUMB_TONES.length]!}
        />
      ))}
      {hasMore && !expanded ? (
        <button
          type="button"
          className="nct-jobs-show-more"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
        >
          Xem thêm · {hiddenCount} hướng nghề
        </button>
      ) : null}
    </div>
  );
}

function NgheJobCard({
  row,
  href,
  tone,
}: {
  row: NgheNganhRow;
  href: string;
  tone: string;
}) {
  const title = ngheLabel(row);
  const desc = ngheShortDesc(row);
  const coverUrl = getCoverUrl(row.cover_id);

  return (
    <Link href={href} className="nct-job-card">
      <span className="nct-job-arrow" aria-hidden>
        ↗
      </span>
      <div className={`nct-job-thumb ${tone}`}>
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            width={320}
            height={180}
            className="nct-job-thumb-img"
            sizes="(max-width: 720px) 50vw, 264px"
          />
        ) : (
          <span className="nct-job-thumb-ph" aria-hidden>
            {ngheThumbInitials(title)}
          </span>
        )}
      </div>
      <div className="nct-job-body">
        <div className="nct-job-title">{title}</div>
        {desc ? <p className="nct-job-desc">{desc}</p> : null}
      </div>
    </Link>
  );
}
