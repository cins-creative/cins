"use client";

import { useEffect, useState } from "react";

import { LoTrinhPhatTrienSlides } from "@/app/thong-tin-du-an/LoTrinhPhatTrienDeck";
import { ThongTinDuAnSlides } from "@/app/thong-tin-du-an/ThongTinDuAnDeck";
import { TtdaClosingSlide } from "@/app/thong-tin-du-an/TtdaClosingSlide";
import {
  DeckTabBar,
  useTtdaDeck,
} from "@/app/thong-tin-du-an/ttda-deck-shared";
import { type TtdaHubMode } from "@/app/thong-tin-du-an/TtdaModeKicker";

const SLIDE_COUNT = 8;

const DUAN_TABS = [
  { href: "#sec-a", color: "var(--cins-blue)", no: "01", label: "Dự án" },
  { href: "#sec-b", color: "var(--cins-orange)", no: "02", label: "Vấn đề" },
  { href: "#sec-c", color: "var(--cins-mint)", no: "03", label: "Mục đích" },
  { href: "#sec-d", color: "var(--cins-violet)", no: "04", label: "Giải pháp" },
  { href: "#sec-e", color: "var(--cins-yellow)", no: "05", label: "Doanh thu" },
  {
    href: "#sec-f",
    color: "var(--cins-blue-dark)",
    no: "06",
    label: "Thời điểm",
  },
] as const;

const LOTRINH_TABS = [
  {
    href: "#phase-1",
    color: "var(--cins-mint)",
    no: "01",
    label: "Thư viện ngành nghề",
  },
  {
    href: "#phase-2",
    color: "var(--cins-blue)",
    no: "02",
    label: "Platform sáng tạo VN",
  },
  {
    href: "#phase-3",
    color: "var(--cins-orange)",
    no: "03",
    label: "10.000 user",
  },
  {
    href: "#phase-4",
    color: "var(--cins-yellow)",
    no: "04",
    label: "Doanh thu",
  },
  {
    href: "#phase-5",
    color: "var(--cins-violet)",
    no: "05",
    label: "Mọi ngành nghề",
  },
] as const;

export function ThongTinDuAnHub() {
  const [mode, setMode] = useState<TtdaHubMode>("du-an");
  const tabbarClass =
    mode === "du-an" ? "ttda-tabbar-du-an" : "ttda-tabbar-lo-trinh";
  const tabs = mode === "du-an" ? DUAN_TABS : LOTRINH_TABS;
  const { deckRef, cur, onTabNavigate } = useTtdaDeck(tabbarClass);

  useEffect(() => {
    deckRef.current?.scrollTo({ top: 0 });
  }, [mode, deckRef]);

  return (
    <div className="ttda-root">
      <div className="ttda-deck-panel">
        <DeckTabBar
          tabs={tabs}
          slideCount={SLIDE_COUNT}
          currentIndex={cur}
          tabbarClass={tabbarClass}
          ariaLabel={
            mode === "du-an" ? "Mục lục thông tin dự án" : "Lộ trình"
          }
          onNavigate={onTabNavigate}
        />

        <main
          className="deck"
          id={mode === "du-an" ? "deck-du-an" : "deck-lo-trinh"}
          ref={deckRef}
          key={mode}
        >
          {mode === "du-an" ? (
            <ThongTinDuAnSlides mode={mode} onModeChange={setMode} />
          ) : (
            <LoTrinhPhatTrienSlides mode={mode} onModeChange={setMode} />
          )}
          <TtdaClosingSlide mode={mode} onModeChange={setMode} />
        </main>
      </div>
    </div>
  );
}
