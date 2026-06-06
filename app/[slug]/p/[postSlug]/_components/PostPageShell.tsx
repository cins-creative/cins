"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import { PostFocusToggle } from "@/components/journey/PostFocusToggle";
import { PostBackButton } from "@/app/[slug]/p/[postSlug]/PostBackButton";
import { usePostFocusMode } from "@/lib/journey/use-post-focus-mode";

const PostFocusModeContext = createContext(false);

export function usePostFocusModeState() {
  return useContext(PostFocusModeContext);
}

type Props = {
  fallbackHref: string;
  children: ReactNode;
};

export function PostPageShell({ fallbackHref, children }: Props) {
  const { focusMode, toggle } = usePostFocusMode(true);

  return (
    <PostFocusModeContext.Provider value={focusMode}>
      <div
        className={`j-post-page-toolbar${focusMode ? " j-post-page-toolbar--focus" : ""}`}
      >
        {!focusMode ? <PostBackButton fallbackHref={fallbackHref} /> : null}
        <PostFocusToggle active={focusMode} onToggle={toggle} />
      </div>
      <div className="j-post-page-body">{children}</div>
    </PostFocusModeContext.Provider>
  );
}
