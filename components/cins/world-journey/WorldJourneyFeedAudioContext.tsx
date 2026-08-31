"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "cins-wj-feed-playback";

type StoredPlayback = {
  muted?: boolean;
  loopOn?: boolean;
};

type FeedPlayback = {
  muted: boolean;
  toggleMuted: () => void;
  loopOn: boolean;
  toggleLoop: () => void;
};

const WorldJourneyFeedAudioContext = createContext<FeedPlayback | null>(null);

function readStored(): StoredPlayback {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredPlayback;
  } catch {
    return {};
  }
}

function writeStored(next: StoredPlayback) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function WorldJourneyFeedAudioProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [muted, setMuted] = useState(true);
  const [loopOn, setLoopOn] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (typeof stored.muted === "boolean") setMuted(stored.muted);
    if (typeof stored.loopOn === "boolean") setLoopOn(stored.loopOn);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStored({ muted, loopOn });
  }, [hydrated, muted, loopOn]);

  const toggleMuted = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);
  const toggleLoop = useCallback(() => {
    setLoopOn((prev) => !prev);
  }, []);
  const value = useMemo(
    () => ({ muted, toggleMuted, loopOn, toggleLoop }),
    [muted, toggleMuted, loopOn, toggleLoop],
  );
  return (
    <WorldJourneyFeedAudioContext.Provider value={value}>
      {children}
    </WorldJourneyFeedAudioContext.Provider>
  );
}

/** Trong World Journey: một mute + loop cho timeline + rail + listing + Reels. */
export function useWorldJourneyFeedAudio(): FeedPlayback {
  const ctx = useContext(WorldJourneyFeedAudioContext);
  const [localMuted, setLocalMuted] = useState(true);
  const [localLoop, setLocalLoop] = useState(false);
  const toggleLocal = useCallback(() => {
    setLocalMuted((prev) => !prev);
  }, []);
  const toggleLocalLoop = useCallback(() => {
    setLocalLoop((prev) => !prev);
  }, []);
  if (ctx) return ctx;
  return {
    muted: localMuted,
    toggleMuted: toggleLocal,
    loopOn: localLoop,
    toggleLoop: toggleLocalLoop,
  };
}
