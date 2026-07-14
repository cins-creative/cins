"use client";

import {
  FEED_SCORE,
  breakdownDiemHienTai,
  gioConLaiDecay,
} from "@/lib/cins/feed-scoring";
import type { WorldBoostDiemFeedSnapshot } from "@/lib/cins/world-boost-types";

type Props = {
  diemFeed: WorldBoostDiemFeedSnapshot | null;
  /** `compact` = grid card; `table` = listing columns content. */
  variant?: "compact" | "table";
};

function fmtGioConLai(gio: number): string {
  if (gio <= 0) return "0 giờ";
  if (gio >= 48) {
    const ngay = Math.round(gio / 24);
    return `${ngay} ngày`;
  }
  if (gio >= 24) {
    const ngay = Math.floor(gio / 24);
    const gioDu = Math.round(gio % 24);
    if (gioDu === 0) return `${ngay} ngày`;
    return `${ngay} ngày ${gioDu} giờ`;
  }
  const rounded = Math.round(gio);
  return `${rounded} giờ`;
}

function tooltipBreakdown(diemFeed: WorldBoostDiemFeedSnapshot): string {
  const b = breakdownDiemHienTai(diemFeed);
  return `Cơ bản: ${b.diemCoBan} · Nội dung: ${b.diemNoiDung} · Verify: ${b.diemVerify} · Engagement: ${b.diemEngagement} · Decay: ${b.decayPct}%`;
}

export function fmtAdminFeedGioConLai(
  diemFeed: WorldBoostDiemFeedSnapshot | null,
): string {
  if (!diemFeed) return "—";
  return fmtGioConLai(gioConLaiDecay(diemFeed.bat_dau_luc));
}

export function AdminFeedScoreCell({
  diemFeed,
  variant = "compact",
}: Props) {
  if (!diemFeed) {
    return (
      <span className="ndd-score ndd-score--empty" title="Không áp điểm Timeline">
        —
      </span>
    );
  }

  const b = breakdownDiemHienTai(diemFeed);
  const diem = Math.round(b.diemHienTai);
  const max =
    diemFeed.diem_verify > 0
      ? FEED_SCORE.MAX_TOTAL_VERIFIED
      : FEED_SCORE.MAX_TOTAL;
  const pct = Math.max(0, Math.min(100, (diem / max) * 100));
  const tone = pct >= 45 ? "high" : "low";
  const tip = tooltipBreakdown(diemFeed);

  return (
    <span
      className={`ndd-score ndd-score--${variant} ndd-score--${tone}`}
      title={tip}
    >
      <span className="ndd-score-num">{diem}</span>
      <span
        className="ndd-score-bar"
        role="progressbar"
        aria-valuenow={diem}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`Điểm ${diem} / ${max}`}
      >
        <span className="ndd-score-bar-fill" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}
