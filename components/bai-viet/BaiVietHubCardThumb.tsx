"use client";

import { useState } from "react";

type Props = {
  src: string | null;
  title: string;
};

function hubThumbInitials(title: string): string {
  const w = title.split(/\s+/).filter(Boolean);
  if (w.length >= 2) {
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  }
  return title.slice(0, 2).toUpperCase() || "BV";
}

export function BaiVietHubCardThumb({ src, title }: Props) {
  const [failed, setFailed] = useState(false);
  const trimmed = src?.trim() ?? "";
  const showImg = Boolean(trimmed) && !failed;

  return (
    <div
      className={`hn-role-thumb${showImg ? " hn-role-thumb--has-img" : ""}`}
    >
      <div className="career-hub-card-thumb">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmed}
            alt=""
            className="career-hub-card-img"
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="career-hub-card-ph hn-nganh-card-ph" aria-hidden>
            <span className="hn-nganh-thumb-label">{hubThumbInitials(title)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
