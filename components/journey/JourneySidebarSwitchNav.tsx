"use client";

import {
  Grid3X3,
  UserRound,
  Waypoints,
} from "lucide-react";

import type { JourneyProfileView } from "@/components/journey/JourneySidebar";
import {
  journeyHrefForView,
  useJourneyView,
} from "@/components/journey/JourneyViewContext";

type Props = {
  slug: string;
  friendCount?: number;
};

export function JourneySidebarSwitchNav({ slug, friendCount }: Props) {
  const { view: activeView, setView } = useJourneyView();

  return (
    <nav className="j-profile-switch" aria-label="Chuyển giao diện hồ sơ">
      <ProfileSwitchButton
        slug={slug}
        view="journey"
        activeView={activeView}
        onSelect={setView}
        icon={<Waypoints size={15} aria-hidden />}
        label="Journey"
      />
      <ProfileSwitchButton
        slug={slug}
        view="gallery"
        activeView={activeView}
        onSelect={setView}
        icon={<Grid3X3 size={15} aria-hidden />}
        label="Gallery"
      />
      <ProfileSwitchButton
        slug={slug}
        view="friends"
        activeView={activeView}
        onSelect={setView}
        icon={<UserRound size={15} aria-hidden />}
        label="Friends"
        count={friendCount}
      />
    </nav>
  );
}

function ProfileSwitchButton({
  slug,
  view,
  activeView,
  onSelect,
  icon,
  label,
  count,
}: {
  slug: string;
  view: JourneyProfileView;
  activeView: JourneyProfileView;
  onSelect: (view: JourneyProfileView) => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  const href = journeyHrefForView(slug, view);
  const active = view === activeView;
  const countLabel =
    count != null ? count.toLocaleString("vi-VN") : null;

  return (
    <a
      href={href}
      className={`j-profile-switch-btn${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-label={
        countLabel != null ? `${label}, ${countLabel} bạn bè` : label
      }
      onClick={(event) => {
        event.preventDefault();
        if (!active) onSelect(view);
      }}
    >
      <span className="j-profile-switch-ico">{icon}</span>
      <span className="j-profile-switch-label" aria-hidden>
        <span className="j-profile-switch-label-text">{label}</span>
        {countLabel != null ? (
          <span className="j-profile-switch-count">{countLabel}</span>
        ) : null}
      </span>
    </a>
  );
}
