import Link from "next/link";

import type { StaticRelCardData, StaticRelItemData, StaticRelTileData } from "./nghe-static-data";

function RelTip({
  thumb,
  thumbBg,
  tip,
  tipClass,
}: {
  thumb: string;
  thumbBg: string;
  tip: StaticRelItemData["tip"];
  tipClass?: string;
}) {
  return (
    <div
      className={`rel-tip${tipClass ? ` ${tipClass}` : ""}${tip.thumbnailSrc ? " rel-tip--has-thumb" : ""}`}
    >
      <div className="rel-tip-head">
        <div className="rel-tip-thumb" style={{ background: thumbBg }}>
          {thumb}
        </div>
        <div>
          <div className="rel-tip-name">{tip.name}</div>
          <div className="rel-tip-kind">{tip.kind}</div>
        </div>
      </div>
      {tip.thumbnailSrc ? (
        <div className="rel-tip-thumb-strip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tip.thumbnailSrc}
            alt={tip.thumbnailAlt ?? ""}
            className="rel-tip-thumb-photo"
            width={280}
            height={158}
          />
        </div>
      ) : null}
      <div className="rel-tip-desc">{tip.desc}</div>
      <div className="rel-tip-meta">
        {tip.meta.map((m) => (
          <span
            key={m}
            className={
              tip.metaHot === m
                ? "hot"
                : tip.metaOk === m
                  ? "ok"
                  : tip.metaWarn === m
                    ? "warn"
                    : undefined
            }
          >
            {m}
          </span>
        ))}
      </div>
      {tip.footLeft || tip.footRight ? (
        <div className="rel-tip-foot">
          <span>{tip.footLeft ?? ""}</span>
          {tip.footRight ? <strong>{tip.footRight}</strong> : null}
        </div>
      ) : null}
    </div>
  );
}

export function StaticRelItem({ item }: { item: StaticRelItemData }) {
  return (
    <Link href={item.href ?? "#"} className="rel-item">
      <span className="rel-thumb" style={{ background: item.thumbBg }}>
        {item.thumb}
      </span>
      <span className="rel-name">
        {item.name}
        {item.sub ? <small>{item.sub}</small> : null}
      </span>
      <RelTip
        thumb={item.thumb}
        thumbBg={item.thumbBg}
        tip={item.tip}
        tipClass={item.tipClass ?? "tip-left"}
      />
    </Link>
  );
}

export function StaticRelCard({ item }: { item: StaticRelCardData }) {
  return (
    <Link href={item.href ?? "#"} className="rel-card">
      <span className="rel-thumb" style={{ background: item.thumbBg }}>
        {item.thumb}
      </span>
      <span className="rel-card-body">
        <strong>{item.name}</strong>
        {item.sub ? <span>{item.sub}</span> : null}
      </span>
      <span className="rel-card-arrow" aria-hidden>
        →
      </span>
      <RelTip
        thumb={item.thumb}
        thumbBg={item.thumbBg}
        tip={item.tip}
        tipClass={item.tipClass}
      />
    </Link>
  );
}

export function StaticRelTile({ item }: { item: StaticRelTileData }) {
  return (
    <Link href={item.href ?? "#"} className="rel-tile">
      <span className="rel-thumb thumb-sm" style={{ background: item.thumbBg }}>
        {item.thumb}
      </span>
      <span className="rel-name">{item.name}</span>
      <RelTip
        thumb={item.thumb}
        thumbBg={item.thumbBg}
        tip={item.tip}
        tipClass={item.tipClass}
      />
    </Link>
  );
}
