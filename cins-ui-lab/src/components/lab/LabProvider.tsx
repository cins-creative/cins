"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  MOCK_GUEST_SESSION,
  MOCK_LOGGED_IN_SESSION,
  resolvePersona,
  resolveSeeking,
  type MockGiaiDoan,
  type MockPersona,
  type MockSession,
} from "@/mocks/session";

type LabContextValue = {
  session: MockSession;
  authenticated: boolean;
  persona: MockPersona;
  seeking: boolean;
  giaiDoan: MockGiaiDoan;
  setAuthenticated: (value: boolean) => void;
  setGiaiDoan: (value: MockGiaiDoan) => void;
};

const LabContext = createContext<LabContextValue | null>(null);

export function LabProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [giaiDoan, setGiaiDoan] = useState<MockGiaiDoan>("dang_hoc");

  const value = useMemo<LabContextValue>(() => {
    const session: MockSession = authenticated
      ? {
          ...MOCK_LOGGED_IN_SESSION,
          profile: {
            ...MOCK_LOGGED_IN_SESSION.profile!,
            giaiDoan,
          },
        }
      : MOCK_GUEST_SESSION;

    return {
      session,
      authenticated,
      giaiDoan,
      persona: resolvePersona(giaiDoan),
      seeking: resolveSeeking(giaiDoan),
      setAuthenticated,
      setGiaiDoan,
    };
  }, [authenticated, giaiDoan]);

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

export function useLab() {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error("useLab must be used within LabProvider");
  return ctx;
}
