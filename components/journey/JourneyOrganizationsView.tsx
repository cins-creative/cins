"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { UserOrganizationsPageResult } from "@/lib/journey/user-orgs-fetch";

type Props = {
  initialData?: UserOrganizationsPageResult;
  ownerSlug: string;
};

function formatVnDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

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
        <div className="j-orgs-list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="j-org-card j-org-card--skel" aria-hidden />
          ))}
        </div>
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
          {data.memberships.map((item) => {
            const initial = item.org.ten.charAt(0).toUpperCase();
            const body = (
              <>
                <span className="j-org-card-avatar" aria-hidden>
                  {item.org.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.org.avatarUrl} alt="" />
                  ) : (
                    initial
                  )}
                </span>
                <span className="j-org-card-copy">
                  <strong>{item.org.ten}</strong>
                  <span className="j-org-card-meta">
                    {item.org.loaiLabel}
                    <span className="j-org-card-dot" aria-hidden>
                      ·
                    </span>
                    {item.vaiTroLabel}
                  </span>
                  <span className="j-org-card-date">
                    Tham gia từ {formatVnDate(item.tuNgay)}
                  </span>
                </span>
                {item.org.href ? (
                  <ExternalLink size={14} strokeWidth={2} className="j-org-card-link-ic" aria-hidden />
                ) : null}
              </>
            );

            return (
              <li key={item.id}>
                {item.org.href ? (
                  <Link href={item.org.href} className="j-org-card">
                    {body}
                  </Link>
                ) : (
                  <div className="j-org-card j-org-card--static">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
