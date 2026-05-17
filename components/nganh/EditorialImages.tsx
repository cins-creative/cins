"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { resolveEditorialImageUrl } from "@/lib/nganh/editorialImage";

const ROTATE_MS = 4000;
const WIPE_MS = 900;

type Props = {
  images: string[];
};

export function EditorialImages({ images }: Props) {
  const urls = images.map(resolveEditorialImageUrl).filter(Boolean);
  const [active, setActive] = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [wipeOn, setWipeOn] = useState(false);
  const activeRef = useRef(0);
  const incomingRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    if (urls.length <= 1 || reducedMotionRef.current) return;

    const id = window.setInterval(() => {
      if (incomingRef.current !== null) return;
      const next = (activeRef.current + 1) % urls.length;
      setIncoming(next);
      setWipeOn(false);
    }, ROTATE_MS);

    return () => window.clearInterval(id);
  }, [urls.length, urls.join("|")]);

  useEffect(() => {
    if (incoming === null) return;
    const r = requestAnimationFrame(() => {
      requestAnimationFrame(() => setWipeOn(true));
    });
    return () => cancelAnimationFrame(r);
  }, [incoming]);

  const finishWipe = () => {
    if (incoming === null) return;
    setActive(incoming);
    activeRef.current = incoming;
    setIncoming(null);
    setWipeOn(false);
  };

  if (!urls.length) return null;

  const showWipe = incoming !== null && urls.length > 1;

  return (
    <div
      className="nct-editorial-banner"
      aria-label="Ảnh minh họa ngành học"
      aria-live="polite"
    >
      <div className="nct-editorial-banner-stage">
        <div className="nct-editorial-banner-layer is-base">
          <Image
            src={urls[active]!}
            alt=""
            fill
            className="nct-editorial-banner-img"
            sizes="(min-width: 1100px) 860px, 100vw"
            priority
          />
        </div>

        {showWipe ? (
          <div
            className={`nct-editorial-banner-layer is-wipe${wipeOn ? " is-wiping" : ""}`}
            style={{ transitionDuration: `${WIPE_MS}ms` }}
            onTransitionEnd={(e) => {
              if (e.propertyName === "clip-path" && wipeOn) finishWipe();
            }}
          >
            <Image
              src={urls[incoming]!}
              alt=""
              fill
              className="nct-editorial-banner-img"
              sizes="(min-width: 1100px) 860px, 100vw"
              priority={incoming === 0}
            />
          </div>
        ) : null}

        <span className="nct-editorial-banner-overlay" aria-hidden />

        {urls.length > 1 ? (
          <div className="nct-editorial-banner-dots" aria-hidden>
            {urls.map((_, i) => (
              <span
                key={i}
                className={`nct-editorial-banner-dot${i === active && !showWipe ? " is-on" : i === incoming && showWipe ? " is-on" : ""}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
