"use client";

export type CoSoMobileShellTab = "info" | "content" | "notify";

const TABS: ReadonlyArray<{ id: CoSoMobileShellTab; label: string }> = [
  { id: "info", label: "Thông tin" },
  { id: "content", label: "Nội dung" },
  { id: "notify", label: "Thông báo" },
];

type Props = {
  value: CoSoMobileShellTab;
  onChange: (tab: CoSoMobileShellTab) => void;
};

export function CoSoMobileShellNav({ value, onChange }: Props) {
  return (
    <nav
      className="cso-mobile-shell-nav"
      role="tablist"
      aria-label="Khu vực trang cơ sở"
    >
      {TABS.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`cso-shell-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`cso-shell-panel-${tab.id}`}
            className={`cso-mobile-shell-nav-btn${selected ? " is-on" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
