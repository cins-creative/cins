"use client";

import { TicketPercent } from "lucide-react";

type Props = {
  lines: string[];
};

function buildRunLines(lines: string[]): string[] {
  if (lines.length === 0) return [];
  /** Mỗi “vòng” đủ dài — tránh khoảng trống giữa viewport khi cuộn. */
  const repeats = lines.length === 1 ? 6 : 3;
  const out: string[] = [];
  for (let r = 0; r < repeats; r += 1) out.push(...lines);
  return out;
}

function VoucherRun({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={`${line}-${i}`} className="ch-list-card-voucher-strip-item">
          {line}
          <span className="ch-list-card-voucher-strip-sep" aria-hidden>
            ◆
          </span>
        </span>
      ))}
    </>
  );
}

/** Strip voucher cuối card shop — ticker vòng lặp mượt (2 run giống nhau). */
export function ChListVoucherTicker({ lines }: Props) {
  if (lines.length === 0) return null;

  const runLines = buildRunLines(lines);

  return (
    <div className="ch-list-card-voucher-strip" aria-label="Voucher đang chạy">
      <span className="ch-list-card-voucher-strip-perf" aria-hidden />
      <div className="ch-list-card-voucher-strip-brand" aria-hidden>
        <TicketPercent size={15} strokeWidth={2.25} />
        <span>Voucher</span>
      </div>
      <div className="ch-list-card-voucher-strip-marquee">
        <div className="ch-list-card-voucher-strip-track">
          <span className="ch-list-card-voucher-strip-run">
            <VoucherRun lines={runLines} />
          </span>
          <span className="ch-list-card-voucher-strip-run" aria-hidden>
            <VoucherRun lines={runLines} />
          </span>
        </div>
      </div>
      <p className="ch-list-sr-only">{lines.join(" - ")}</p>
    </div>
  );
}
