"use client";

import { UserCheck } from "lucide-react";

import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";

type Props = {
  slug: string;
  name: string;
  avatarUrl: string | null;
  subtitle: string;
  /** Đã là bạn bè (kết bạn) → hiện icon nhỏ cạnh tên. */
  isFriend?: boolean;
};

/** Một dòng gợi ý người — click avatar/tên mở card hồ sơ. */
export function HaUserSuggestionRow({
  slug,
  name,
  avatarUrl,
  subtitle,
  isFriend = false,
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
            <span className="ha-row-name">
              {name}
              {isFriend ? (
                <span
                  className="ha-row-friend-badge"
                  title="Đã là bạn bè"
                  aria-label="Đã là bạn bè"
                >
                  <UserCheck size={13} strokeWidth={2.2} aria-hidden />
                </span>
              ) : null}
            </span>
            <span className="ha-row-sub">{subtitle}</span>
          </span>
        </span>
      </JourneyUserPopover>
    </div>
  );
}
