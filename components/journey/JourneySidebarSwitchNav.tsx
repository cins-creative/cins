"use client";

import {
  Building2,
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
  orgCount?: number;
};

export function JourneySidebarSwitchNav({ slug, friendCount, orgCount }: Props) {
  const { view: activeView, setView } = useJourneyView();

  return (
    <nav className="j-profile-switch" aria-label="Chuyển giao diện hồ sơ">
      <ProfileFeedToggle
        slug={slug}
        activeView={activeView}
        onSelect={setView}
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
      <ProfileSwitchButton
        slug={slug}
        view="organizations"
        activeView={activeView}
        onSelect={setView}
        icon={<Building2 size={15} aria-hidden />}
        label="Tổ chức"
        count={orgCount}
      />
    </nav>
  );
}

function ProfileFeedToggle({
  slug,
  activeView,
  onSelect,
}: {
  slug: string;
  activeView: JourneyProfileView;
  onSelect: (view: JourneyProfileView) => void;
}) {
  const isJourney = activeView === "journey";
  const isGallery = activeView === "gallery";

  return (
    <div className="j-profile-feed-toggle" role="group" aria-label="Journey hoặc Gallery">
      <FeedToggleSegment
        slug={slug}
        view="journey"
        active={isJourney}
        icon={<Waypoints size={14} aria-hidden />}
        label="Journey"
        onSelect={onSelect}
      />
      <FeedToggleSegment
        slug={slug}
        view="gallery"
        active={isGallery}
        icon={<Grid3X3 size={14} aria-hidden />}
        label="Gallery"
        onSelect={onSelect}
      />
    </div>
  );
}

function FeedToggleSegment({
  slug,
  view,
  active,
  icon,
  label,
  onSelect,
}: {
  slug: string;
  view: "journey" | "gallery";
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onSelect: (view: JourneyProfileView) => void;
}) {
  const href = journeyHrefForView(slug, view);

  return (
    <a
      href={href}
      className={`j-profile-feed-toggle-seg${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-pressed={active}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        if (!active) onSelect(view);
      }}
    >
      <span className="j-profile-feed-toggle-ico">{icon}</span>
      <span className="j-profile-feed-toggle-label">{label}</span>
    </a>
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
        countLabel != null ? `${label}, ${countLabel}` : label
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
