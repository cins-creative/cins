"use client";

import { JourneyUserFollowButton } from "@/components/journey/JourneyUserFollowButton";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";

type Props = {
  userId: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  subtitle: string;
  viewerProfileId: string | null;
};

/** Một dòng gợi ý người — click avatar/tên mở card hồ sơ, nút riêng để theo dõi. */
export function HaUserSuggestionRow({
  userId,
  slug,
  name,
  avatarUrl,
  subtitle,
  viewerProfileId,
}: Props) {
  return (
    <div className="ha-row">
      <JourneyUserPopover
        slug={slug}
        fallbackName={name}
        fallbackAvatarUrl={avatarUrl}
      >
        <span className="ha-row-pop-body">
          <span className="ha-row-av">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" width={40} height={40} />
            ) : (
              <span className="ha-row-av-fallback" aria-hidden>
                {name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </span>
          <span className="ha-row-meta">
            <span className="ha-row-name">{name}</span>
            <span className="ha-row-sub">{subtitle}</span>
          </span>
        </span>
      </JourneyUserPopover>
      <JourneyUserFollowButton
        targetUserId={userId}
        viewerProfileId={viewerProfileId}
        compact
      />
    </div>
  );
}
