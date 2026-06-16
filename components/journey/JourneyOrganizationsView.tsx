"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  JourneyOrgMembershipCard,
  JourneyOrgMembershipCardSkeleton,
} from "@/components/journey/JourneyOrgMembershipCard";
import type { UserOrganizationsPageResult } from "@/lib/journey/user-orgs-fetch";

type Props = {
  initialData?: UserOrganizationsPageResult;
  ownerSlug: string;
};

export function JourneyOrganizationsView({ initialData, ownerSlug }: Props) {
  const [data, setData] = useState<UserOrganizationsPageResult | "loading" | "error">(
    initialData ?? "loading",
  );

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/journey/${encodeURIComponent(ownerSlug)}/organizations`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("organizations fetch failed");
        const json = (await res.json()) as UserOrganizationsPageResult;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialData, ownerSlug]);

  if (data === "loading") {
    return (
      <section className="j-orgs" aria-busy="true" aria-label="Tổ chức">
        <div className="j-orgs-head">
          <h2 className="j-orgs-title">Tổ chức</h2>
        </div>
        <ul className="j-orgs-list">
          {[0, 1, 2, 3].map((i) => (
            <li key={i}>
              <JourneyOrgMembershipCardSkeleton />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (data === "error") {
    return (
      <section className="j-orgs" aria-live="polite">
        <p className="j-load-error">Không tải được danh sách tổ chức.</p>
      </section>
    );
  }

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
