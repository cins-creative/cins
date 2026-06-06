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

import { AuthRequiredModal } from "@/components/auth/AuthRequiredModal";

type AuthGateContextValue = {
  isAuthenticated: boolean;
  openAuthModal: (message?: string) => void;
  closeAuthModal: () => void;
  requireAuth: (action: () => void) => void;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

type Props = {
  children: ReactNode;
  initialAuthenticated: boolean;
};

export function AuthGateRoot({ children, initialAuthenticated }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    setIsAuthenticated(initialAuthenticated);
  }, [initialAuthenticated]);

  const openAuthModal = useCallback((nextMessage?: string) => {
    setMessage(nextMessage);
    setOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setOpen(false);
    setMessage(undefined);
  }, []);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
        return;
      }
      openAuthModal();
    },
    [isAuthenticated, openAuthModal],
  );

  const value = useMemo(
    () => ({
      isAuthenticated,
      openAuthModal,
      closeAuthModal,
      requireAuth,
    }),
    [isAuthenticated, openAuthModal, closeAuthModal, requireAuth],
  );

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <AuthRequiredModal
        open={open}
        message={message}
        onClose={closeAuthModal}
      />
    </AuthGateContext.Provider>
  );
}

export function useAuthGate(): AuthGateContextValue {
  const ctx = useContext(AuthGateContext);
  if (!ctx) {
    throw new Error("useAuthGate must be used within AuthGateRoot");
  }
  return ctx;
}

/** Optional hook — trả null nếu không có provider (component dùng chung). */
export function useOptionalAuthGate(): AuthGateContextValue | null {
  return useContext(AuthGateContext);
}
