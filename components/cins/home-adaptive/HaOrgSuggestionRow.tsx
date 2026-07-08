"use client";

import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import { OrgFollowButton } from "@/components/cins/home-adaptive/OrgFollowButton";
import {
  orgFollowSubtitle,
  type OrgFollowSuggestion,
} from "@/lib/cins/home-adaptive/suggestions-display";
import {
  haOrgKindForPopover,
  haOrgProfileHref,
} from "@/lib/cins/home-adaptive/org-popover-kind";

type Props = {
  org: OrgFollowSuggestion;
};

/** Một dòng gợi ý tổ chức — click avatar/tên mở card org, nút riêng để theo dõi. */
export function HaOrgSuggestionRow({ org }: Props) {
  const orgKind = haOrgKindForPopover(org.loaiToChuc);
  const profileHref = haOrgProfileHref(org.loaiToChuc, org.slug);

  const body = (
    <span className="ha-row-pop-body">
      <span className="ha-row-av">
        {org.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.avatarUrl} alt="" width={40} height={40} />
        ) : (
          <span className="ha-row-av-fallback" aria-hidden>
            {org.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      <span className="ha-row-meta">
        <span className="ha-row-name">{org.name}</span>
        <span className="ha-row-sub">
          {orgFollowSubtitle(org.loaiToChuc, org.reason)}
        </span>
      </span>
    </span>
  );

  return (
    <div className="ha-row">
      {orgKind ? (
        <JourneyOrgPopover
          slug={org.slug}
          orgKind={orgKind}
          href={profileHref}
          fallbackName={org.name}
          fallbackAvatarUrl={org.avatarUrl}
        >
          {body}
        </JourneyOrgPopover>
      ) : (
        body
      )}
      <OrgFollowButton orgId={org.id} compact />
    </div>
  );
}
