"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { PostFocusToggle } from "@/components/journey/PostFocusToggle";
import { PostBackButton } from "@/app/[slug]/p/[postSlug]/PostBackButton";
import { usePostFocusMode } from "@/lib/journey/use-post-focus-mode";
import type { MilestoneContentKind } from "@/lib/journey/post-media";

const PostFocusModeContext = createContext(false);

export function usePostFocusModeState() {
  return useContext(PostFocusModeContext);
}

function readPostContentKind(): MilestoneContentKind | null {
  if (typeof document === "undefined") return null;
  const raw = document
    .querySelector(".j-post-page")
    ?.getAttribute("data-post-content-kind");
  if (raw === "article" || raw === "photo" || raw === "video") return raw;
  return null;
}

type Props = {
  fallbackHref: string;
  children: ReactNode;
};

export function PostPageShell({ fallbackHref, children }: Props) {
  const [contentKind, setContentKind] = useState<MilestoneContentKind | null>(
    null,
  );
  const focusEnabled = contentKind === "article";
  const { focusMode, toggle, exit } = usePostFocusMode(focusEnabled);

  useEffect(() => {
    const page = document.querySelector(".j-post-page");
    if (!page) return;

    const sync = () => setContentKind(readPostContentKind());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(page, {
      attributes: true,
      attributeFilter: ["data-post-content-kind"],
      subtree: true,
      childList: true,
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!focusEnabled && focusMode) exit();
  }, [focusEnabled, focusMode, exit]);

  return (
    <PostFocusModeContext.Provider value={focusMode}>
      <div
        className={`j-post-page-toolbar${focusMode ? " j-post-page-toolbar--focus" : ""}`}
      >
        {!focusMode ? <PostBackButton fallbackHref={fallbackHref} /> : null}
        {focusEnabled ? (
          <PostFocusToggle active={focusMode} onToggle={toggle} />
        ) : null}
      </div>
      <div className="j-post-page-body">{children}</div>
    </PostFocusModeContext.Provider>
  );
}
