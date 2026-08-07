"use client";

import { DoorOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import {
  ModuleCard,
  ModuleEmpty,
} from "@/components/cins/home-adaptive/ModuleCard";
import { useDraftModuleItemLimit } from "@/components/cins/home-adaptive/draft-module-limit";
import {
  compareLopHocByUrgency,
  resolveNextLopHocSession,
  type LopHocCuaBanItem,
} from "@/lib/cins/home-adaptive/lop-hoc-next";

function refreshNext(items: LopHocCuaBanItem[], nowMs: number): LopHocCuaBanItem[] {
  return items
    .map((item) => ({
      ...item,
      next: resolveNextLopHocSession(item.lichHoc, nowMs),
    }))
    .sort(compareLopHocByUrgency);
}

function LopHocRow({
  item,
  onOpen,
}: {
  item: LopHocCuaBanItem;
  onOpen: () => void;
}) {
  const soon = item.next.isSoon;
  const disabled = !item.roomId;
  const sub = [item.tenKhoa, item.orgTen].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      className={`ha-trow ha-trow--lop${soon ? " is-soon" : ""}${disabled ? " is-disabled" : ""}`}
      onClick={onOpen}
      disabled={disabled}
      aria-label={
        disabled
          ? `${item.maLop} — phòng chat chưa sẵn sàng`
          : `Vào lớp ${item.maLop}`
      }
      title={
        disabled
          ? "Phòng chat lớp chưa sẵn sàng"
          : soon
            ? "Vào phòng học"
            : "Mở phòng chat lớp"
      }
    >
      <span className="ha-trow-th ha-trow-th--lop" aria-hidden>
        {soon ? (
          <DoorOpen size={18} strokeWidth={2.2} />
        ) : (
          item.maLop.slice(0, 2).toUpperCase()
        )}
      </span>
      <div className="ha-trow-meta">
        <div className="ha-trow-name">{item.maLop}</div>
        <div className="ha-trow-sub">{sub}</div>
      </div>
      <span
        className={`ha-lop-eta${soon ? " is-soon" : ""}${item.next.status === "dang_dien_ra" ? " is-live" : ""}`}
      >
        {item.next.label}
      </span>
    </button>
  );
}

export function LopHocCuaBanPanel({
  items,
  limit = 3,
}: {
  items: LopHocCuaBanItem[];
  limit?: number;
}) {
  const { openChat } = useCinsChat();
  const liveLimit = useDraftModuleItemLimit("lop_hoc_cua_ban", limit);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    const refreshed = refreshNext(items, nowMs);
    const n = Math.min(10, Math.max(1, Math.round(liveLimit)));
    return refreshed.slice(0, n);
  }, [items, liveLimit, nowMs]);

  const soonCount = rows.filter((r) => r.next.isSoon).length;

  if (rows.length === 0) {
    return (
      <ModuleCard
        icon={DoorOpen}
        title="Phòng học"
        className="ha-card--lop"
      >
        <ModuleEmpty>Chưa có lớp nào để vào phòng.</ModuleEmpty>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard
      icon={DoorOpen}
      title="Phòng học"
      badge={soonCount > 0 ? String(soonCount) : undefined}
      className="ha-card--lop"
    >
      {rows.map((item) => (
        <LopHocRow
          key={item.lopId}
          item={item}
          onOpen={() => {
            if (!item.roomId) return;
            void openChat({ roomId: item.roomId, tab: "to_chuc" });
          }}
        />
      ))}
    </ModuleCard>
  );
}
