"use client";

import { createContext } from "react";

/** Overlay bài (`JourneyPostModal` / `PostModalShell`) — rail hiện nút X. */
export const PostOverlayCloseContext = createContext<(() => void) | null>(null);
