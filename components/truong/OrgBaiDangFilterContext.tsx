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

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { PersonalFilter } from "@/lib/filter/types";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";

type Ctx = {
  filters: PersonalFilter[];
  loading: boolean;
  canManage: boolean;
  refreshFilters: () => Promise<void>;
};

const OrgBaiDangFilterContext = createContext<Ctx | null>(null);

export function useOrgBaiDangFilter(): Ctx {
  const ctx = useContext(OrgBaiDangFilterContext);
  if (!ctx) {
    throw new Error("useOrgBaiDangFilter requires OrgBaiDangFilterProvider");
  }
  return ctx;
}

export function useOrgBaiDangFilterOptional(): Ctx | null {
  return useContext(OrgBaiDangFilterContext);
}

export function OrgBaiDangFilterProvider({
  orgId,
  children,
}: {
  orgId: string;
  children: ReactNode;
}) {
  const inline = useTruongInlineEdit();
  const [filters, setFilters] = useState<PersonalFilter[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = Boolean(inline?.isEditing);

  const refreshFilters = useCallback(async () => {
    const res = await truongInlineFetch(orgId, "/filters");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const json = (await res.json()) as {
      filters?: Array<{
        id: string;
        ten: string;
        slug: string;
        mau: string | null;
        thuTu: number;
        count?: number;
      }>;
    };
    setFilters(
      (json.filters ?? []).map((f) => ({
        id: f.id,
        ten: f.ten,
        slug: f.slug,
        mau: f.mau,
        thuTu: f.thuTu,
        count: f.count,
      })),
    );
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void refreshFilters();
  }, [refreshFilters]);

  const value = useMemo(
    () => ({
      filters,
      loading,
      canManage,
      refreshFilters,
    }),
    [filters, loading, canManage, refreshFilters],
  );

  return (
    <OrgBaiDangFilterContext.Provider value={value}>
      {children}
    </OrgBaiDangFilterContext.Provider>
  );
}

export async function createOrgBaiDangFilterClient(
  orgId: string,
  ten: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await truongInlineFetch(orgId, "/filters", {
    method: "POST",
    body: JSON.stringify({ ten }),
  });
  if (!res.ok) {
    return { ok: false, error: await readTruongInlineError(res) };
  }
  return { ok: true };
}

export async function deleteOrgBaiDangFilterClient(
  orgId: string,
  filterId: string,
): Promise<boolean> {
  const res = await truongInlineFetch(
    orgId,
    `/filters/${encodeURIComponent(filterId)}`,
    { method: "DELETE" },
  );
  return res.ok;
}
