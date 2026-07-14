"use client";

import {
  DEFAULT_FEED_SCORE_CONFIG,
  type FeedScoreConfig,
} from "@/lib/cins/feed-scoring-config";
import {
  breakdownDiemHienTai,
  gioConLaiDecay,
} from "@/lib/cins/feed-scoring";
import type { WorldBoostDiemFeedSnapshot } from "@/lib/cins/world-boost-types";

type Props = {
  diemFeed: WorldBoostDiemFeedSnapshot | null;
  /** `compact` = grid card; `table` = listing columns content. */
  variant?: "compact" | "table";
  /** Trọng số runtime — ảnh hưởng decay / trần thanh. */
  scoreConfig?: FeedScoreConfig | null;
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

function tooltipBreakdown(
  diemFeed: WorldBoostDiemFeedSnapshot,
  cfg: FeedScoreConfig,
): string {
  const b = breakdownDiemHienTai(diemFeed, Date.now(), cfg);
  const uu =
    b.diemUuTien > 0 ? ` · Ưu tiên: ${b.diemUuTien}` : "";
  return `Cơ bản: ${b.diemCoBan} · Nội dung: ${b.diemNoiDung} · Verify: ${b.diemVerify} · Engagement: ${b.diemEngagement}${uu} · Decay: ${b.decayPct}%`;
}

export function fmtAdminFeedGioConLai(
  diemFeed: WorldBoostDiemFeedSnapshot | null,
  scoreConfig?: FeedScoreConfig | null,
): string {
  if (!diemFeed) return "—";
  const cfg = scoreConfig ?? DEFAULT_FEED_SCORE_CONFIG;
  return fmtGioConLai(gioConLaiDecay(diemFeed.bat_dau_luc, Date.now(), cfg));
}

export function AdminFeedScoreCell({
  diemFeed,
  variant = "compact",
  scoreConfig,
}: Props) {
  const cfg = scoreConfig ?? DEFAULT_FEED_SCORE_CONFIG;

  if (!diemFeed) {
    return (
      <span className="ndd-score ndd-score--empty" title="Không áp điểm Timeline">
        —
      </span>
    );
  }

  const b = breakdownDiemHienTai(diemFeed, Date.now(), cfg);
  const diem = Math.round(b.diemHienTai);
  const max =
    diemFeed.diem_verify > 0 ? cfg.MAX_TOTAL_VERIFIED : cfg.MAX_TOTAL;
  const pct = Math.max(0, Math.min(100, (diem / max) * 100));
  const tone = pct >= 45 ? "high" : "low";
  const tip = tooltipBreakdown(diemFeed, cfg);

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
