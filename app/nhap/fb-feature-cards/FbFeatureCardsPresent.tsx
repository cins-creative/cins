"use client";

import { useCallback, useRef, useState } from "react";

import { FbFeatureCard } from "./FbFeatureCard";
import { downloadAllFbCards } from "./export-fb-cards";
import { FB_FEATURE_CARDS } from "./feature-cards-data";

import "./fb-feature-cards.css";

export function FbFeatureCardsPresent() {
  const [exportMode, setExportMode] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const setCardRef = useCallback((id: string) => {
    return (el: HTMLElement | null) => {
      if (el) cardRefs.current.set(id, el);
      else cardRefs.current.delete(id);
    };
  }, []);

  async function handleDownloadAll() {
    if (downloading) return;

    setDownloading(true);
    setDownloadProgress("Chuẩn bị…");
    setExportMode(true);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const cards = FB_FEATURE_CARDS.map((card) => ({
      id: card.id,
      el: cardRefs.current.get(card.id)!,
    })).filter((item) => item.el);

    const { ok, failed } = await downloadAllFbCards(cards, (done, total) => {
      setDownloadProgress(`Đang tải ${done}/${total}…`);
    });

    setDownloading(false);
    setDownloadProgress(
      failed.length > 0
        ? `Xong ${ok}/${cards.length} — lỗi: ${failed.join(", ")}`
        : `Đã tải ${ok} ảnh 1080×1080`,
    );
  }

  return (
    <div className="fb-present">
      <header className="fb-present__header">
        <p className="fb-present__eyebrow">Trang nháp · Facebook 1:1</p>
        <h1 className="fb-present__title">Template giới thiệu tính năng CINs</h1>
        <p className="fb-present__lead">
          Bộ Shop cho Artist + <strong>Trang sự kiện</strong> (pre-order, quầy shop).
          Ảnh brief · lưới 2 cột preview lớn.
        </p>
        <div className="fb-present__toolbar">
          <button
            type="button"
            className={`fb-present__btn${exportMode ? " fb-present__btn--active" : ""}`}
            onClick={() => setExportMode(true)}
            disabled={downloading}
          >
            Export 1080×1080
          </button>
          <button
            type="button"
            className={`fb-present__btn${!exportMode ? " fb-present__btn--active" : ""}`}
            onClick={() => setExportMode(false)}
            disabled={downloading}
          >
            Xem lưới preview
          </button>
          <button
            type="button"
            className="fb-present__btn fb-present__btn--primary"
            onClick={() => void handleDownloadAll()}
            disabled={downloading}
          >
            {downloading ? "Đang tải…" : "Tải về tất cả"}
          </button>
          <p className="fb-present__hint">
            {downloadProgress ??
              (exportMode
                ? "Zoom 100% → chụp từng card 1080×1080 cho Facebook."
                : `${FB_FEATURE_CARDS.length} card · 2 cột · ~600px/card`)}
          </p>
        </div>
      </header>

      <div
        className={`fb-present__grid${exportMode ? " fb-present__grid--export" : ""}${downloading ? " fb-present__grid--capturing" : ""}`}
      >
        {FB_FEATURE_CARDS.map((card) => (
          <FbFeatureCard
            key={card.id}
            card={card}
            exportRef={setCardRef(card.id)}
          />
        ))}
      </div>
    </div>
  );
}
