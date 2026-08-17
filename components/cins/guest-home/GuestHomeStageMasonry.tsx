"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type {
  GuestHomeStageKeywordTone,
  GuestHomeStageMasonryItem,
} from "@/lib/cins/guest-home/loadGuestHomeStageMasonry";

const KEYWORD_EVERY = 4;

const STAGE_KEYWORD_CARDS: GuestHomeStageMasonryItem[] = [
  {
    id: "kw-commission",
    kind: "keyword",
    title: "Commission",
    kicker: "Open",
    tone: "violet",
    imageSrc: null,
    href: null,
    aspectRatio: "4 / 5",
  },
  {
    id: "kw-shop",
    kind: "keyword",
    title: "Shop",
    kicker: "Live",
    tone: "blue",
    imageSrc: null,
    href: null,
    aspectRatio: "1 / 1",
  },
  {
    id: "kw-preorder",
    kind: "keyword",
    title: "Pre-order",
    kicker: "Soon",
    tone: "orange",
    imageSrc: null,
    href: null,
    aspectRatio: "3 / 4",
  },
  {
    id: "kw-event",
    kind: "keyword",
    title: "Event\nFestival",
    kicker: "Join",
    tone: "yellow",
    imageSrc: null,
    href: null,
    aspectRatio: "5 / 4",
  },
  {
    id: "kw-portfolio",
    kind: "keyword",
    title: "Portfolio",
    kicker: "Work",
    tone: "mint",
    imageSrc: null,
    href: null,
    aspectRatio: "4 / 5",
  },
  {
    id: "kw-studio",
    kind: "keyword",
    title: "Studio",
    kicker: "Collab",
    tone: "violet",
    imageSrc: null,
    href: null,
    aspectRatio: "3 / 4",
  },
];

const KEYWORD_MARK: Record<GuestHomeStageKeywordTone, string> = {
  violet: "sq",
  blue: "dot",
  orange: "tri",
  yellow: "dot",
  mint: "dia",
};

function weaveKeywordCards(
  items: GuestHomeStageMasonryItem[],
): GuestHomeStageMasonryItem[] {
  const media = items.filter((item) => item.kind !== "keyword");
  if (media.length === 0) return STAGE_KEYWORD_CARDS.slice(0, 3);

  const out: GuestHomeStageMasonryItem[] = [];
  let ki = 0;
  for (let i = 0; i < media.length; i++) {
    out.push(media[i]!);
    if ((i + 1) % KEYWORD_EVERY === 0) {
      const card = STAGE_KEYWORD_CARDS[ki % STAGE_KEYWORD_CARDS.length]!;
      out.push({ ...card, id: `${card.id}-${ki}` });
      ki += 1;
    }
  }
  return out;
}

function distributeItems(
  items: GuestHomeStageMasonryItem[],
  columnCount: number,
) {
  const columns: GuestHomeStageMasonryItem[][] = Array.from(
    { length: columnCount },
    () => [],
  );

  items.forEach((item, index) => {
    columns[index % columnCount]!.push(item);
  });

  return columns;
}

function KeywordTile({ item }: { item: GuestHomeStageMasonryItem }) {
  const tone = item.tone ?? "violet";
  const mark = KEYWORD_MARK[tone];
  const lines = item.title.split("\n").filter(Boolean);

  return (
    <div
      className={`gh-stage-tile gh-stage-tile--keyword gh-stage-tile--tone-${tone}`}
      style={
        {
          "--gh-tile-ratio": item.aspectRatio,
          aspectRatio: item.aspectRatio,
        } as CSSProperties
      }
    >
      <div className="gh-stage-keyword" data-word={lines[0]}>
        <span
          className={`gh-stage-mark gh-stage-mark--${mark}`}
          aria-hidden
        />
        <p className="gh-stage-keyword-word">
          {lines.map((line) => (
            <span key={line} className="gh-stage-keyword-line">
              {line}
            </span>
          ))}
        </p>
        {item.kicker ? (
          <span className="gh-stage-keyword-kicker">{item.kicker}</span>
        ) : null}
      </div>
    </div>
  );
}

function StageTile({ item }: { item: GuestHomeStageMasonryItem }) {
  if (item.kind === "keyword") return <KeywordTile item={item} />;

  return (
    <div
      className={`gh-stage-tile gh-stage-tile--${item.kind}`}
      style={
        {
          "--gh-tile-ratio": item.aspectRatio,
          aspectRatio: item.aspectRatio,
        } as CSSProperties
      }
    >
      <div className="gh-stage-media">
        {item.imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageSrc}
            alt=""
            className="gh-stage-media-img"
            loading="eager"
            decoding="async"
            draggable={false}
          />
        ) : (
          <span
            className={`gh-stage-media-ph gh-stage-media-ph--${item.kind}`}
            aria-hidden
          />
        )}
      </div>
      {item.kind === "product" && item.priceLabel ? (
        <span className="gh-stage-tile-price">{item.priceLabel}</span>
      ) : null}
    </div>
  );
}

function ColumnSegment({
  items,
  copy,
}: {
  items: GuestHomeStageMasonryItem[];
  copy: "a" | "b";
}) {
  return items.map((item) => (
    <StageTile key={`${copy}-${item.id}`} item={item} />
  ));
}

function MasonryColumn({
  items,
  columnIndex,
}: {
  items: GuestHomeStageMasonryItem[];
  columnIndex: number;
}) {
  const firstRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLDivElement>(null);
  const [loopPx, setLoopPx] = useState(0);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const first = firstRef.current;
    const second = secondRef.current;
    if (!first || !second || items.length === 0) return;

    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const next = Math.round(second.offsetTop - first.offsetTop);
      if (next > 0) setLoopPx(next);
    };

    const waitForImages = () => {
      const imgs = [...first.querySelectorAll("img")];
      return Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              }),
        ),
      );
    };

    const ro = new ResizeObserver(measure);
    ro.observe(first);
    ro.observe(second);

    void waitForImages().then(() => {
      if (cancelled) return;
      measure();
      setReady(true);
    });

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="gh-stage-masonry-col" data-col={columnIndex}>
      <div
        className={`gh-stage-masonry-track${ready && loopPx > 0 ? " is-ready" : ""}`}
        style={{ "--gh-masonry-loop": `${loopPx}px` } as CSSProperties}
      >
        <div ref={firstRef} className="gh-stage-masonry-seg">
          <ColumnSegment items={items} copy="a" />
        </div>
        <div ref={secondRef} className="gh-stage-masonry-seg" aria-hidden>
          <ColumnSegment items={items} copy="b" />
        </div>
      </div>
    </div>
  );
}

type Props = {
  items: GuestHomeStageMasonryItem[];
};

export function GuestHomeStageMasonry({ items }: Props) {
  const columns = useMemo(
    () => distributeItems(weaveKeywordCards(items), 3),
    [items],
  );

  return (
    <div className="gh-stage-masonry" aria-hidden>
      <div className="gh-stage-masonry-cols">
        {columns.map((columnItems, index) => (
          <MasonryColumn
            key={`col-${index}`}
            items={columnItems}
            columnIndex={index}
          />
        ))}
      </div>
    </div>
  );
}
