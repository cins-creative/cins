"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import type { WorldBoostLoai } from "@/lib/cins/world-boost-client";
import { worldBoostKey } from "@/lib/cins/world-boost-client";

type Ctx = {
  canBoost: boolean;
  isBoosted: (loai: WorldBoostLoai, id: string) => boolean;
  toggle: (loai: WorldBoostLoai, id: string, next: boolean) => void;
  pending: boolean;
};

const WorldBoostAdminContext = createContext<Ctx | null>(null);

export function WorldBoostAdminProvider({
  canBoost,
  initialBoostedKeys,
  children,
}: {
  canBoost: boolean;
  initialBoostedKeys?: string[];
  children: ReactNode;
}) {
  const [keys, setKeys] = useState(() => new Set(initialBoostedKeys ?? []));
  const [pending, startTransition] = useTransition();

  const isBoosted = useCallback(
    (loai: WorldBoostLoai, id: string) => keys.has(worldBoostKey(loai, id)),
    [keys],
  );

  const toggle = useCallback(
    (loai: WorldBoostLoai, id: string, next: boolean) => {
      if (!canBoost) return;
      const key = worldBoostKey(loai, id);
      setKeys((prev) => {
        const n = new Set(prev);
        if (next) n.add(key);
        else n.delete(key);
        return n;
      });
      startTransition(async () => {
        try {
          const res = await fetch("/api/admin/world-boost", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ loai, id, dangBat: next }),
          });
          if (!res.ok) {
            setKeys((prev) => {
              const n = new Set(prev);
              if (next) n.delete(key);
              else n.add(key);
              return n;
            });
          }
        } catch {
          setKeys((prev) => {
            const n = new Set(prev);
            if (next) n.delete(key);
            else n.add(key);
            return n;
          });
        }
      });
    },
    [canBoost],
  );

  const value = useMemo(
    () => ({ canBoost, isBoosted, toggle, pending }),
    [canBoost, isBoosted, toggle, pending],
  );

  return (
    <WorldBoostAdminContext.Provider value={value}>
      {children}
    </WorldBoostAdminContext.Provider>
  );
}

export function useWorldBoostAdminOptional(): Ctx | null {
  return useContext(WorldBoostAdminContext);
}
