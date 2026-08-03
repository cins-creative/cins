"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { HocPhiComboTab } from "@/components/co-so/quan-ly/HocPhiComboTab";
import { HocPhiGoiTab } from "@/components/co-so/quan-ly/HocPhiGoiTab";

type TabId = "goi" | "combo";

type Props = { orgId: string };

function resolveTab(raw: string | null): TabId {
  return raw === "combo" ? "combo" : "goi";
}

export function HocPhiQuanLyClient({ orgId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = useMemo(
    () => resolveTab(searchParams.get("tab")),
    [searchParams],
  );

  const setTab = useCallback(
    (next: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "goi") params.delete("tab");
      else params.set("tab", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="cso-hp-page">
      <div className="cso-hp-tabs" role="tablist" aria-label="Học phí">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "goi"}
          className={`cso-hp-tab${tab === "goi" ? " on" : ""}`}
          onClick={() => setTab("goi")}
        >
          Học phí cơ bản
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "combo"}
          className={`cso-hp-tab${tab === "combo" ? " on" : ""}`}
          onClick={() => setTab("combo")}
        >
          Combo &amp; Discount
        </button>
      </div>

      <div className="cso-hp-tab-panel" role="tabpanel">
        {tab === "goi" ? (
          <HocPhiGoiTab orgId={orgId} />
        ) : (
          <HocPhiComboTab orgId={orgId} />
        )}
      </div>
    </div>
  );
}
