"use client";

import { useState } from "react";

import { TinNhanQuanLyClient } from "@/components/co-so/quan-ly/TinNhanQuanLyClient";
import { OrgInboxPanel } from "@/components/truong/OrgInboxPanel";
import type { OrgQuanLyKind } from "@/lib/to-chuc/org-quan-ly-routes";

type MainTab = "tu_van" | "verify";

type Props = {
  orgKind: OrgQuanLyKind;
  orgId: string;
  orgSlug: string;
};

function tabsForKind(orgKind: OrgQuanLyKind): Array<[MainTab, string]> {
  if (orgKind === "truong_dai_hoc") {
    return [
      ["tu_van", "Tư vấn"],
      ["verify", "Chờ xác thực"],
    ];
  }
  return [["tu_van", "Tư vấn"]];
}

function OrgTinNhanInboxClient({
  orgKind,
  orgId,
  orgSlug,
}: {
  orgKind: Exclude<OrgQuanLyKind, "co_so_dao_tao">;
  orgId: string;
  orgSlug: string;
}) {
  const tabs = tabsForKind(orgKind);
  const showTabBar = tabs.length > 1;
  const [mainTab, setMainTab] = useState<MainTab>("tu_van");
  const [flash, setFlash] = useState<string | null>(null);

  const activeTab = showTabBar ? mainTab : "tu_van";
  const verifyFilter = activeTab === "verify" ? ("verify" as const) : undefined;

  return (
    <div className="cso-tin-nhan">
      {flash ? <p className="cso-tin-nhan-flash" role="status">{flash}</p> : null}

      <div
        className="cso-tin-nhan-panel cins-chat-panel"
        role="region"
        aria-label="Tin nhắn tổ chức"
      >
        {showTabBar ? (
          <div className="cso-tin-nhan-tabs" role="tablist" aria-label="Loại hội thoại">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mainTab === id}
                className={`cso-tin-nhan-tab${mainTab === id ? " is-active" : ""}`}
                onClick={() => setMainTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="cso-tin-nhan-body">
          <OrgInboxPanel
            key={activeTab === "verify" ? "verify" : "tu_van"}
            orgId={orgId}
            className="cso-tin-nhan-inbox"
            hideFilters={activeTab === "verify"}
            filterOverride={verifyFilter}
            initialFilter={activeTab === "verify" ? "verify" : "open"}
            onToast={(message) => {
              setFlash(message);
              window.setTimeout(() => setFlash(null), 4000);
            }}
          />
        </div>
      </div>

      <span className="sr-only">{orgSlug}</span>
    </div>
  );
}

/**
 * Inbox quản lý tin nhắn theo loại org.
 * Cơ sở đào tạo giữ `TinNhanQuanLyClient` (tab Cơ sở + CTA học phí).
 */
export function OrgTinNhanQuanLyClient({ orgKind, orgId, orgSlug }: Props) {
  if (orgKind === "co_so_dao_tao") {
    return <TinNhanQuanLyClient orgId={orgId} orgSlug={orgSlug} />;
  }
  return (
    <OrgTinNhanInboxClient orgKind={orgKind} orgId={orgId} orgSlug={orgSlug} />
  );
}
