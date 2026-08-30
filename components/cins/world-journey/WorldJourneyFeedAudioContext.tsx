"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type FeedAudio = {
  muted: boolean;
  toggleMuted: () => void;
};

const WorldJourneyFeedAudioContext = createContext<FeedAudio | null>(null);

export function WorldJourneyFeedAudioProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [muted, setMuted] = useState(true);
  const toggleMuted = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);
  const value = useMemo(() => ({ muted, toggleMuted }), [muted, toggleMuted]);
  return (
    <WorldJourneyFeedAudioContext.Provider value={value}>
      {children}
    </WorldJourneyFeedAudioContext.Provider>
  );
}

/** Trong World Journey: một mute cho timeline + rail + listing + Reels. */
export function useWorldJourneyFeedAudio(): FeedAudio {
  const ctx = useContext(WorldJourneyFeedAudioContext);
  const [localMuted, setLocalMuted] = useState(true);
  const toggleLocal = useCallback(() => {
    setLocalMuted((prev) => !prev);
  }, []);
  if (ctx) return ctx;
  return { muted: localMuted, toggleMuted: toggleLocal };
}
