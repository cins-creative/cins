"use client";

import { createElement, useEffect, useState } from "react";

import { ensureDotLottieWc } from "@/lib/cins/lottie-runtime";

type Props = {
  src: string;
  className?: string;
};

export function PostLottieFileEmbed({ src, className = "" }: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    void ensureDotLottieWc()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Không tải được Lottie player.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div
      className={`b-embed b-embed-ro is-lottie-file${className ? ` ${className}` : ""}`}
      data-provider="lottie-file"
    >
      {error ? (
        <p className="ed-embed-compose-error" role="alert">
          {error}
        </p>
      ) : ready
        ? createElement("dotlottie-wc", {
            src,
            autoplay: true,
            loop: true,
            style: { width: "100%", height: "100%" },
          })
        : null}
    </div>
  );
}
