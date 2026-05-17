import type { MainNavIcon } from "@/lib/cins/mainNav";

type Props = { name: MainNavIcon };

export function SidebarNavIcon({ name }: Props) {
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M3 11.5L12 4l9 7.5" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case "gallery":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "career":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M15.5 8.5L13 13l-4.5 2.5L11 11l4.5-2.5z" />
        </svg>
      );
    case "university":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M12 4l10 4-10 4L2 8l10-4z" />
          <path d="M6 10v5c0 2 3 3.5 6 3.5s6-1.5 6-3.5v-5" />
          <path d="M22 8v6" />
        </svg>
      );
    case "training":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M3 21V8l9-5 9 5v13" />
          <path d="M9 21v-7h6v7" />
          <path d="M3 21h18" />
        </svg>
      );
    case "courses":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M3 4.5A1.5 1.5 0 014.5 3H11v17H4.5A1.5 1.5 0 013 18.5v-14z" />
          <path d="M21 4.5A1.5 1.5 0 0019.5 3H13v17h6.5a1.5 1.5 0 001.5-1.5v-14z" />
          <path d="M6 7h2M6 10h2M16 7h2M16 10h2" />
        </svg>
      );
    case "business":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
          <path d="M3 12h18" />
        </svg>
      );
    case "events":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18" />
          <path d="M8 3v4M16 3v4" />
        </svg>
      );
    case "blog":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M14 3l7 7-11 11H3v-7L14 3z" />
          <path d="M13 4l7 7" />
        </svg>
      );
    case "help":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      );
    default:
      return null;
  }
}
