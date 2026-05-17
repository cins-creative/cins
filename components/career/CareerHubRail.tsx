import Link from "next/link";

import { CareerHubRailIcon } from "@/components/career/CareerHubRailIcon";
import type { LinhVucSidebarGroup } from "@/lib/career/groupLinhVuc";
import { railGroupThemeClass } from "@/lib/career/hubRailTheme";
import type { LinhVucRow } from "@/lib/career/types";
import type { NganhSidebarGroup } from "@/lib/nganh/types";

type TabKey = "nghe" | "nganh-hoc";

function ChevronDown() {
  return (
    <svg
      className="hn-rail-chev"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

type Props = {
  tab: TabKey;
  sidebarGroups: LinhVucSidebarGroup[];
  activeSlug: string;
  nganhSidebarGroups?: NganhSidebarGroup[];
  activeNhomId?: string;
};

export function CareerHubRail({
  tab,
  sidebarGroups,
  activeSlug,
  nganhSidebarGroups = [],
  activeNhomId = "",
}: Props) {
  const base = "/nghe-nghiep";
  const isNganh = tab === "nganh-hoc";

  if (isNganh) {
    return (
      <aside className="hn-rail" aria-label="Danh mục nhóm ngành">
        <div className="hn-rail-tab" role="tablist">
          <Link href={base} role="tab" aria-selected={false}>
            Nghề nghiệp
          </Link>
          <Link
            href={`${base}?tab=nganh-hoc`}
            className="is-on"
            role="tab"
            aria-selected
          >
            Ngành học
          </Link>
        </div>
        <ul className="hn-rail-list">
          <li>
            <ul className="hn-rail-sub hn-rail-sub--flat">
              <li>
                <Link
                  href={`${base}?tab=nganh-hoc`}
                  className={!activeNhomId ? "is-on" : undefined}
                >
                  Tất cả ngành
                </Link>
              </li>
            </ul>
          </li>

          {nganhSidebarGroups.map((group) => {
            const theme = railGroupThemeClass(group.nhomKey ?? group.heading);
            const openDefault = activeNhomId === group.id;

            return (
              <li key={group.id}>
                <details
                  className={`hn-rail-group ${theme}`}
                  open={openDefault}
                >
                  <summary>
                    <span className="hn-rail-ico">
                      <CareerHubRailIcon theme={theme} />
                    </span>
                    <span className="hn-rail-label">{group.heading}</span>
                    <span className="hn-rail-badge">{group.links.length}</span>
                    <ChevronDown />
                  </summary>
                  <ul className="hn-rail-sub">
                    {group.links.map((link) => (
                      <li key={link.id}>
                        <Link href={`/nganh-hoc/${link.slug}`}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      </aside>
    );
  }

  const grouped = sidebarGroups.filter((g) => g.heading);
  const flat = sidebarGroups.filter((g) => !g.heading);
  return (
    <aside className="hn-rail" aria-label="Danh mục lĩnh vực">
      <div className="hn-rail-tab" role="tablist">
        <Link
          href={base}
          className={tab === "nghe" ? "is-on" : undefined}
          role="tab"
          aria-selected={tab === "nghe"}
        >
          Nghề nghiệp
        </Link>
        <Link href={`${base}?tab=nganh-hoc`} role="tab" aria-selected={false}>
          Ngành học
        </Link>
      </div>

      <ul className="hn-rail-list">
        {flat.length > 0 ? (
          <li>
            <ul className="hn-rail-sub hn-rail-sub--flat">
              {flat.flatMap((g) => g.links).map((lv) => (
                <RailLink key={lv.id} lv={lv} base={base} tab={tab} activeSlug={activeSlug} />
              ))}
            </ul>
          </li>
        ) : null}

        {grouped.map((group) => {
          const theme = railGroupThemeClass(group.nhomKey ?? group.heading);
          const openDefault =
            tab === "nghe" &&
            group.links.some((lv) => (lv.slug ?? "") === activeSlug);

          return (
            <li key={group.id}>
              <details className={`hn-rail-group ${theme}`} open={openDefault}>
                <summary>
                  <span className="hn-rail-ico">
                    <CareerHubRailIcon theme={theme} />
                  </span>
                  <span className="hn-rail-label">{group.heading}</span>
                  <span className="hn-rail-badge">{group.links.length}</span>
                  <ChevronDown />
                </summary>
                <ul className="hn-rail-sub">
                  {group.links.map((lv) => (
                    <RailLink
                      key={lv.id}
                      lv={lv}
                      base={base}
                      tab={tab}
                      activeSlug={activeSlug}
                    />
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function RailLink({
  lv,
  base,
  tab,
  activeSlug,
}: {
  lv: LinhVucRow;
  base: string;
  tab: TabKey;
  activeSlug: string;
}) {
  const slug = lv.slug ?? "";
  if (!slug) return null;
  const active = slug === activeSlug && tab === "nghe";
  const label = lv.ten_vi ?? lv.ten ?? lv.ten_en ?? slug;
  const href =
    tab === "nganh-hoc"
      ? `${base}?tab=nganh-hoc`
      : `${base}?linh_vuc=${encodeURIComponent(slug)}`;

  return (
    <li>
      <Link href={href} className={active ? "is-on" : undefined}>
        {label}
      </Link>
    </li>
  );
}
