import type { MetaPhanMem } from "@/lib/articles/types";

export function MetaBoxPhanMem({ meta }: { meta: MetaPhanMem }) {
  const hasWeb = Boolean(meta.website?.trim());

  return (
    <div
      className={hasWeb ? "l3-meta" : "l3-meta l3-meta--3"}
      aria-label="Thông tin phần mềm"
    >
      <div className="l3-meta-cell">
        <div className="lbl">Nhà phát hành</div>
        <div className="val">{meta.nha_phat_hanh}</div>
      </div>
      <div className="l3-meta-cell">
        <div className="lbl">Phiên bản</div>
        <div className="val" style={{ fontFamily: "var(--font-mono)" }}>
          {meta.version}
        </div>
      </div>
      <div className="l3-meta-cell">
        <div className="lbl">Nền tảng</div>
        <div className="platforms">
          {meta.platform.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </div>
      {hasWeb ? (
        <div className="l3-meta-cell">
          <div className="lbl">Website</div>
          <a
            href={meta.website}
            className="val url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {meta.website!.replace(/^https?:\/\//, "")}
          </a>
        </div>
      ) : null}
    </div>
  );
}
