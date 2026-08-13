"use client";

import { Home } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";

export function TtdaIcon({ children }: { children: ReactNode }) {
  return <span aria-hidden>{children}</span>;
}

export function scrollDeckToHash(deck: HTMLElement | null, hash: string) {
  if (!deck || !hash.startsWith("#")) return false;
  const id = hash.slice(1);
  const slide = deck.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (!slide) return false;
  deck.scrollTo({ top: slide.offsetTop, behavior: "smooth" });
  return true;
}

export function scrollDeckToSlide(deck: HTMLElement, slide: HTMLElement) {
  deck.scrollTo({ top: slide.offsetTop, behavior: "smooth" });
}

export type DeckTabItem = {
  href: string;
  color: string;
  no?: string;
  label: string;
};

type DeckTabBarProps = {
  tabs: readonly DeckTabItem[];
  slideCount: number;
  currentIndex: number;
  tabbarClass: string;
  ariaLabel: string;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function DeckTabBar({
  tabs,
  slideCount,
  currentIndex,
  tabbarClass,
  ariaLabel,
  onNavigate,
}: DeckTabBarProps) {
  const total = String(slideCount).padStart(2, "0");

  return (
    <nav className={`tabbar ${tabbarClass}`} aria-label={ariaLabel}>
      <a className="home" href="#top" title="Trang bìa" onClick={onNavigate}>
        <TtdaIcon>
          <Home size={15} strokeWidth={1.6} />
        </TtdaIcon>
      </a>
      {tabs.map((tab) => (
        <a
          key={tab.href}
          className="tab"
          href={tab.href}
          onClick={onNavigate}
          style={{ "--tabc": tab.color } as CSSProperties}
        >
          <span className="dot" style={{ background: tab.color }} />
          {tab.no ? <span className="no">{tab.no}</span> : null}
          {tab.label}
        </a>
      ))}
      <span className="counter">
        {String(currentIndex + 1).padStart(2, "0")} / {total}
      </span>
    </nav>
  );
}

export function useTtdaDeck(tabbarClass: string) {
  const deckRef = useRef<HTMLElement>(null);
  const [cur, setCur] = useState(0);

  const onTabNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute("href");
    if (!href?.startsWith("#")) return;
    if (scrollDeckToHash(deckRef.current, href)) {
      event.preventDefault();
    }
  };

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    const slides = [...deck.querySelectorAll<HTMLElement>(".slide")];
    const tabs = [
      ...document.querySelectorAll<HTMLAnchorElement>(`.${tabbarClass} .tab`),
    ];

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const slide = entry.target as HTMLElement;
          const index = slides.indexOf(slide);
          if (index < 0) return;
          setCur(index);
          tabs.forEach((tab) => tab.classList.remove("active"));
          const match = tabs.find(
            (tab) => tab.getAttribute("href") === `#${slide.id}`,
          );
          if (match) {
            match.classList.add("active");
            match.scrollIntoView({ block: "nearest", inline: "nearest" });
          }
        });
      },
      { root: deck, threshold: 0.55 },
    );

    slides.forEach((slide) => spy.observe(slide));
    return () => spy.disconnect();
  }, [tabbarClass]);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    const slides = [...deck.querySelectorAll<HTMLElement>(".slide")];

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (
        event.key === "ArrowDown" ||
        event.key === "PageDown" ||
        event.key === " "
      ) {
        event.preventDefault();
        const next = Math.min(cur + 1, slides.length - 1);
        const slide = slides[next];
        if (slide) scrollDeckToSlide(deck, slide);
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        const prev = Math.max(cur - 1, 0);
        const slide = slides[prev];
        if (slide) scrollDeckToSlide(deck, slide);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cur]);

  return { deckRef, cur, onTabNavigate };
}
