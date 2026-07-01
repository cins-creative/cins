"use client";

import { useEffect, useState } from "react";

import { formatEventCountdownLabel } from "@/lib/cins/home-adaptive/event-countdown";

const TICK_MS = 60_000;

export function HaOrgUpCountdown({
  batDauIso,
  ketThucIso,
  status,
}: {
  batDauIso: string;
  ketThucIso: string | null;
  status: "active" | "upcoming";
}) {
  const [label, setLabel] = useState(() =>
    formatEventCountdownLabel(batDauIso, ketThucIso, status),
  );

  useEffect(() => {
    const tick = () => {
      setLabel(formatEventCountdownLabel(batDauIso, ketThucIso, status));
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [batDauIso, ketThucIso, status]);

  if (!label) return null;

  const isLive = status === "active" && label === "Đang diễn ra";

  return (
    <p
      className={`ha-org-up-countdown${isLive ? " ha-org-up-countdown--live" : ""}`}
      aria-live="polite"
    >
      {!isLive ? <span className="ha-org-up-countdown-dot" aria-hidden /> : null}
      {label}
    </p>
  );
}
