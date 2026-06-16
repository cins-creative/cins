"use client";

import type { ReactNode } from "react";

import { PostBackButton } from "@/app/[slug]/p/[postSlug]/PostBackButton";

type Props = {
  fallbackHref: string;
  children: ReactNode;
};

export function PostPageShell({ fallbackHref, children }: Props) {
  return (
    <>
      <div className="j-post-page-toolbar">
        <PostBackButton fallbackHref={fallbackHref} />
      </div>
      <div className="j-post-page-body">{children}</div>
    </>
  );
}
