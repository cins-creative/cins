"use client";

import { UserCheck } from "lucide-react";

import { JourneyFollowButton } from "@/components/journey/JourneyFollowButton";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { useKetBanStatus } from "@/lib/social/use-ket-ban-status";

type Props = {
  slug: string;
  name: string;
  avatarUrl: string | null;
  subtitle: string;
  targetUserId: string;
  viewerProfileId: string | null;
  /** Đã là bạn bè (kết bạn) → hiện icon nhỏ cạnh tên. */
  isFriend?: boolean;
  /** `person` — danh sách gọn trong card Người cùng ngành. */
  variant?: "default" | "person";
};

/** Một dòng gợi ý người — click avatar/tên mở card hồ sơ. */
export function HaUserSuggestionRow({
  slug,
  name,
  avatarUrl,
  subtitle,
  targetUserId,
  viewerProfileId,
  isFriend = false,
  variant = "default",
}: Props) {
  const rowClass = variant === "person" ? "ha-person" : "ha-row";
  const ketBan = useKetBanStatus(targetUserId, viewerProfileId);
  const showFriendBtn =
    !isFriend &&
    Boolean(viewerProfileId) &&
    viewerProfileId !== targetUserId &&
    ketBan.quanHe !== "accepted" &&
    ketBan.quanHe !== "blocked";

  return (
    <div className={rowClass}>
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
      {showFriendBtn ? (
        <JourneyFollowButton
          compact
          targetUserId={targetUserId}
          viewerProfileId={viewerProfileId}
          status={ketBan.status}
          ready={ketBan.ready}
          refreshStatus={ketBan.refresh}
        />
      ) : null}
    </div>
  );
}
