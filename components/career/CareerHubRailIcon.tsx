import type { RailGroupTheme } from "@/lib/career/hubRailTheme";

const sw = 1.7;
const stroke = "currentColor";

export function CareerHubRailIcon({ theme }: { theme: RailGroupTheme }) {
  switch (theme) {
    case "g-design":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
          <path d="M3 3l7 17 2-7 7-2L3 3z" />
          <path d="M13.5 13.5l5.5 5.5" />
        </svg>
      );
    case "g-film":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
          <rect x="3" y="7" width="18" height="13" rx="1.5" />
          <path d="M3 11h18" />
          <path d="M7 7l-2 4M12 7l-2 4M17 7l-2 4" />
        </svg>
      );
    case "g-art":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
          <path d="M12 3v3M6.5 6.5l2 2M17.5 6.5l-2 2" />
          <circle cx="12" cy="13" r="6" />
          <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="14" cy="15" r="1" fill="currentColor" stroke="none" />
          <circle cx="12.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "g-arch":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
          <path d="M4 20h16" />
          <path d="M6 20V11l6-6 6 6v9" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "g-fashion":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
          <path d="M8 4l4 3 4-3" />
          <path d="M6 7h12l-1.5 13H7.5L6 7z" />
          <path d="M9.5 11h5" />
        </svg>
      );
    case "g-game":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
          <rect x="2" y="6" width="20" height="12" rx="6" />
          <path d="M6 11h4M8 9v4" />
          <circle cx="15.5" cy="11" r="1.1" />
          <circle cx="17.5" cy="13.5" r="1.1" />
        </svg>
      );
    case "g-music":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
          <path d="M9 18V6l10-2v12" />
          <circle cx="7" cy="18" r="2.5" />
          <circle cx="17" cy="16" r="2.5" />
        </svg>
      );
    case "g-media":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 12.5h5.5M8 16h6" />
        </svg>
      );
    case "g-tech":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} aria-hidden>
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M8 20h8" />
          <path d="M12 18v2" />
          <path d="M7.5 9h9M7.5 12.5h6" />
        </svg>
      );
  }
}
