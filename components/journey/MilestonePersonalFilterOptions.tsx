"use client";

import { Check } from "lucide-react";

import { PersonalFilterMenuIcon } from "@/components/journey/PersonalFilterVisual";
import { DEFAULT_FILTER_MAU } from "@/lib/filter/constants";
import type { PersonalFilter } from "@/lib/filter/types";

type Props = {
  filters: ReadonlyArray<PersonalFilter>;
  selectedSlug: string | null;
  pending?: boolean;
  onSelect: (slug: string) => void;
  variant: "inline" | "submenu";
};

export function MilestonePersonalFilterOptions({
  filters,
  selectedSlug,
  pending = false,
  onSelect,
  variant,
}: Props) {
  if (filters.length === 0) return null;

  const Item = variant === "inline" ? InlineItem : SubmenuItem;

  return (
    <>
      {filters.map((filter) => {
        const active = selectedSlug === filter.slug;
        const mau = filter.mau ?? DEFAULT_FILTER_MAU;
        return (
          <Item
            key={filter.id}
            active={active}
            pending={pending}
            slug={filter.slug}
            label={filter.ten}
            mau={mau}
            onSelect={() => onSelect(filter.slug)}
          />
        );
      })}
    </>
  );
}

function InlineItem({
  active,
  pending,
  slug,
  label,
  mau,
  onSelect,
}: {
  active: boolean;
  pending: boolean;
  slug: string;
  label: string;
  mau: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`j-inline-control-option${active ? " is-active" : ""}`}
      role="menuitemradio"
      aria-checked={active}
      disabled={pending}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <PersonalFilterMenuIcon slug={slug} mau={mau} />
      <span>{label}</span>
      {active ? <Check size={13} strokeWidth={2.1} aria-hidden /> : null}
    </button>
  );
}

function SubmenuItem({
  active,
  pending,
  slug,
  label,
  mau,
  onSelect,
}: {
  active: boolean;
  pending: boolean;
  slug: string;
  label: string;
  mau: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`j-m-submenu-item${active ? " is-active" : ""}`}
      role="menuitemradio"
      aria-checked={active}
      disabled={pending}
      onClick={onSelect}
    >
      <span className="j-m-menu-ico" aria-hidden>
        <PersonalFilterMenuIcon
          slug={slug}
          mau={mau}
          dotClassName="j-m-menu-dot"
        />
      </span>
      <span className="j-m-menu-lbl">{label}</span>
      {active ? (
        <span className="j-m-menu-check" aria-hidden>
          <Check size={14} strokeWidth={2.2} />
        </span>
      ) : null}
    </button>
  );
}
