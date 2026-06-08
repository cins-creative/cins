"use client";

import Image from "next/image";
import Link from "next/link";
import { Users } from "lucide-react";

import type { MilestoneItem } from "@/components/journey/milestone-types";

type Props = {
  milestones: ReadonlyArray<MilestoneItem>;
};

function gridHref(m: MilestoneItem): string {
  const postSlug = m.postSlug?.trim();
  const ownerSlug = m.lensOwnerSlug ?? m.postOwnerSlug ?? "";
  if (ownerSlug && postSlug && postSlug !== m.id) {
    return `/${encodeURIComponent(ownerSlug)}/p/${encodeURIComponent(postSlug)}`;
  }
  if (m.congDongOrg?.href) return m.congDongOrg.href;
  if (ownerSlug) return `/${encodeURIComponent(ownerSlug)}/journey`;
  return "#";
}

export function EntityLightGrid({ milestones }: Props) {
  if (milestones.length === 0) {
    return <p className="entity-light-empty">Chưa có tác phẩm nào gắn tag này.</p>;
  }

  return (
    <div className="entity-light-grid">
      {milestones.map((m) => {
        const preview = m.media?.[0]?.src ?? null;
        const author =
          m.congDongOrg?.name ??
          m.lensOwnerName ??
          (m.lensOwnerSlug ? `@${m.lensOwnerSlug}` : "—");
        return (
          <Link key={m.id} href={gridHref(m)} className="entity-gcard">
            <div
              className={
                "entity-gcard-thumb" + (preview ? " has-img" : " is-empty")
              }
            >
              {preview ? (
                <Image
                  src={preview}
                  alt=""
                  width={400}
                  height={400}
                  sizes="(max-width: 640px) 50vw, 220px"
                  loading="lazy"
                  unoptimized
                />
              ) : (
                <span aria-hidden>{m.title.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="entity-gcard-info">
              <p className="entity-gcard-title">
                {m.title?.trim() || "Không tiêu đề"}
              </p>
              <p className="entity-gcard-author">{author}</p>
              {m.congDongOrg ? (
                <span className="entity-gcard-src">
                  <Users size={11} strokeWidth={2} aria-hidden />
                  {m.congDongOrg.name}
                </span>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
