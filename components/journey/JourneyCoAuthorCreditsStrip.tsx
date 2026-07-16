"use client";

import { ChevronUp, Eye } from "lucide-react";

import { AuthorRoleTooltip } from "@/components/journey/AuthorRoleTooltip";
import { JourneyAuthorRowFriendAction } from "@/components/journey/JourneyAuthorRowFriendAction";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import type { CoAuthorCredit } from "@/components/journey/milestone-types";
import { parseVaiTroPositions } from "@/lib/social/vai-tro";

const MAX_VISIBLE_COAUTHORS = 5;
const AVATAR_TONE_CLASSES = [
  "av-blue",
  "av-green",
  "av-amber",
  "av-purple",
  "av-coral",
];

function AuthorAvatar({
  credit,
  tone,
}: {
  credit: CoAuthorCredit;
  tone: string;
}) {
  return (
    <span className={`av ${tone}`}>
      {credit.avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={credit.avatarUrl} alt="" />
      ) : (
        credit.initial ?? credit.name.slice(0, 1)
      )}
    </span>
  );
}

type Props = {
  credits: ReadonlyArray<CoAuthorCredit>;
  viewerProfileId?: string | null;
  /** Slug viewer — badge «Bạn» khi trùng author. */
  viewerSlug?: string | null;
  /** Chủ bài — badge «Bạn» trên variant tagged. */
  ownerSlug?: string | null;
  variant?: "default" | "tagged";
};

export function JourneyCoAuthorCreditsStrip({
  credits,
  viewerProfileId = null,
  viewerSlug = null,
  ownerSlug = null,
  variant = "default",
}: Props) {
  const coAuthorsOnly = credits.filter((c) => !c.laChuSoHuu);
  if (coAuthorsOnly.length === 0) return null;

  const visibleCoAuthors = credits.slice(0, MAX_VISIBLE_COAUTHORS);
  const hiddenCoAuthorCount = Math.max(
    0,
    credits.length - visibleCoAuthors.length,
  );
  const contributorCount = credits.length;
  const otherContributorCount = coAuthorsOnly.length;

  return (
    <div className="jcard-authors" aria-label="Đồng tác giả">
      <details className="authors-details">
        <summary className="authors-collapsed">
          <span className="av-stack" aria-hidden>
            {visibleCoAuthors.map((c, i) => (
              <AuthorAvatar
                key={`${c.slug ?? c.name}-${i}`}
                credit={c}
                tone={
                  AVATAR_TONE_CLASSES[i % AVATAR_TONE_CLASSES.length] ?? "av-blue"
                }
              />
            ))}
            {hiddenCoAuthorCount > 0 ? (
              <span className="av-more">+{hiddenCoAuthorCount}</span>
            ) : null}
          </span>
          <span className="authors-right">
            <span className="authors-summary">
              {otherContributorCount} người đóng góp khác
            </span>
            <span className="authors-toggle-slot">
              <span className="expand-hint" aria-label="Xem tất cả">
                <Eye size={15} strokeWidth={1.9} aria-hidden />
              </span>
              <span className="collapse-hint" aria-label="Thu gọn">
                <ChevronUp size={15} strokeWidth={2} aria-hidden />
              </span>
            </span>
          </span>
        </summary>
        <div className="authors-expanded">
          <div className="expanded-header">
            <span>{contributorCount} người đóng góp</span>
          </div>
          {credits.map((c, i) => (
            <div
              key={`${c.slug ?? c.name}-${i}`}
              className={
                "author-row-item" +
                (c.trangThai === "pending" ? " is-pending-credit" : "")
              }
            >
              <JourneyUserPopover
                slug={c.slug}
                fallbackName={c.name}
                fallbackAvatarUrl={c.avatarUrl}
              >
                <span className="author-row-person">
                  <AuthorAvatar
                    credit={c}
                    tone={
                      AVATAR_TONE_CLASSES[i % AVATAR_TONE_CLASSES.length] ??
                      "av-blue"
                    }
                  />
                  <span className="author-row-info author-row-inline">
                    <span
                      className={`author-row-name${
                        variant === "tagged" && c.slug && c.slug === ownerSlug
                          ? " is-you"
                          : viewerSlug && c.slug === viewerSlug
                            ? " is-you"
                            : ""
                      }`}
                    >
                      {c.name}
                    </span>
                    {parseVaiTroPositions(c.role).map((pos) => (
                      <AuthorRoleTooltip key={pos} role={pos} />
                    ))}
                  </span>
                </span>
              </JourneyUserPopover>
              {c.laChuSoHuu ? (
                <span className="abadge abadge-owner">Chủ bài</span>
              ) : variant === "tagged" && c.slug && c.slug === ownerSlug ? (
                <span className="abadge abadge-you">Bạn</span>
              ) : c.trangThai === "pending" ? (
                <span className="abadge abadge-pending">Chờ xác nhận</span>
              ) : null}
              <JourneyAuthorRowFriendAction
                targetUserId={c.idNguoiDung}
                viewerProfileId={viewerProfileId}
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
