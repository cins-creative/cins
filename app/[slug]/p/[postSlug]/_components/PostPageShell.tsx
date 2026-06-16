"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function PostPageShell({ children }: Props) {
  return <div className="j-post-page-body">{children}</div>;
}
