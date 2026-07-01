import Link from "next/link";

import { OrgFollowButton } from "@/components/cins/home-adaptive/OrgFollowButton";
import type { OrgFollowSuggestion } from "@/lib/cins/home-adaptive/suggestions";
import { orgFollowSubtitle } from "@/lib/cins/home-adaptive/suggestions";

type Props = {
  org: OrgFollowSuggestion;
};

/** Một dòng gợi ý tổ chức — avatar/tên dẫn trang org, nút riêng để theo dõi. */
export function HaOrgSuggestionRow({ org }: Props) {
  return (
    <div className="ha-row">
      <Link href={org.href} className="ha-row-pop-body ha-row-pop-link" prefetch={false}>
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
      </Link>
      <OrgFollowButton orgId={org.id} compact />
    </div>
  );
}
