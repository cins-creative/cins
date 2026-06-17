"use client";

import Link from "next/link";

import {
  JourneyOrgMembershipCard,
} from "@/components/journey/JourneyOrgMembershipCard";
import type { UserOrganizationsPageResult } from "@/lib/journey/user-orgs-fetch";

type Props = {
  data: UserOrganizationsPageResult;
};

export function JourneyOrganizationsView({ data }: Props) {
  return (
    <section className="j-orgs" aria-label="Tổ chức">
      <header className="j-orgs-head">
        <h2 className="j-orgs-title">Tổ chức</h2>
        <span className="j-orgs-count">{data.totalCount.toLocaleString("vi-VN")}</span>
      </header>

      {data.memberships.length === 0 ? (
        <div className="j-orgs-empty">
          Chưa tham gia tổ chức nào trên CINs.
        </div>
      ) : (
        <ul className="j-orgs-list">
          {data.memberships.map((item) => (
            <li key={item.id}>
              {item.org.href ? (
                <Link href={item.org.href} className="j-org-membership-link">
                  <JourneyOrgMembershipCard item={item} />
                </Link>
              ) : (
                <div className="j-org-membership-link j-org-membership-link--static">
                  <JourneyOrgMembershipCard item={item} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
