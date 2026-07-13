"use client";

import {
  embedIframeAllowAttr,
  embedIframeTitle,
  type EmbedProviderId,
} from "@/lib/editor/embed-providers";

/** Giữ API cũ — hiện không provider nào cần gate “chạm để tương tác”. */
export function embedNeedsInteractionGate(
  _provider: EmbedProviderId | string,
): boolean {
  return false;
}

type Props = {
  provider: EmbedProviderId;
  iframeSrc: string;
};

/** Iframe embed trên timeline — tương tác trực tiếp, không overlay. */
export function EmbedInteractionGate({ provider, iframeSrc }: Props) {
  const title = embedIframeTitle(provider);
  const allow = embedIframeAllowAttr(provider);
  const referrerPolicy =
    provider === "youtube" || provider === "vimeo"
      ? "strict-origin-when-cross-origin"
      : undefined;

  return (
    <iframe
      src={iframeSrc}
      title={title}
      allow={allow}
      referrerPolicy={referrerPolicy}
      allowFullScreen
      loading="lazy"
    />
  );
}
