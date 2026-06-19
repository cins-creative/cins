"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateTextPanelTone } from "@/app/[slug]/journey/actions";
import {
  TEXT_PANEL_TONE_IDS,
  TEXT_PANEL_TONE_LABELS,
  type TextPanelToneId,
} from "@/lib/journey/text-panel-tone";

type Props = {
  tacPhamId: string;
  tone: TextPanelToneId;
  onToneChange: (tone: TextPanelToneId) => void;
};

export function JourneyTextPanelTonePicker({
  tacPhamId,
  tone,
  onToneChange,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(nextTone: TextPanelToneId) {
    if (pending || nextTone === tone) return;
    const previousTone = tone;
    setError(null);
    onToneChange(nextTone);
    startTransition(async () => {
      const result = await updateTextPanelTone(tacPhamId, nextTone);
      if (!result.ok) {
        setError(result.error);
        onToneChange(previousTone);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="jcard-text-panel-tones-wrap">
      <div
        className="jcard-text-panel-tones"
        role="group"
        aria-label="Chọn màu nền card chữ"
      >
        {TEXT_PANEL_TONE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={
              "jcard-text-panel-tone-btn jcard-text-panel-tone-btn--" +
              id +
              (tone === id ? " is-active" : "")
            }
            aria-label={TEXT_PANEL_TONE_LABELS[id]}
            aria-pressed={tone === id}
            disabled={pending}
            onClick={() => pick(id)}
          />
        ))}
      </div>
      {error ? (
        <p className="jcard-text-panel-tones-err" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
