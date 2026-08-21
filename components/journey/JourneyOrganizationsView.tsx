"use client";

import Link from "next/link";

import {
  JourneyOrgMembershipCard,
} from "@/components/journey/JourneyOrgMembershipCard";
import { formatNumber } from "@/lib/format";
import { useT } from "@/lib/i18n/use-t";
import { useLocale } from "@/lib/locale/context";
import type { UserOrganizationsPageResult } from "@/lib/journey/user-orgs-fetch";

type Props = {
  data: UserOrganizationsPageResult;
};

export function JourneyOrganizationsView({ data }: Props) {
  const t = useT();
  const locale = useLocale();
  return (
    <section className="j-orgs" aria-label={t("people.org")}>
      <header className="j-orgs-head">
        <h2 className="j-orgs-title">{t("people.org")}</h2>
        <span className="j-orgs-count">{formatNumber(data.totalCount, locale)}</span>
      </header>

      {data.memberships.length === 0 ? (
        <div className="j-orgs-empty">{t("orgs.empty")}</div>
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
