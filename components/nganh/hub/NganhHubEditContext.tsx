"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type Ctx = {
  canEdit: boolean;
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  isEditing: boolean;
  toast: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
};

const NganhHubEditContext = createContext<Ctx | null>(null);

export function useNganhHubEdit(): Ctx | null {
  return useContext(NganhHubEditContext);
}

export function NganhHubEditProvider({
  children,
  canEdit,
}: {
  children: ReactNode;
  canEdit: boolean;
}) {
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  const isEditing = canEdit && editMode;

  const value = useMemo<Ctx>(
    () => ({
      canEdit,
      editMode,
      setEditMode,
      isEditing,
      toast,
      showToast,
      clearToast,
    }),
    [canEdit, editMode, isEditing, toast, showToast, clearToast],
  );

  return (
    <NganhHubEditContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="nct-toast nct-toast--hub" role="status">
          {toast}
        </div>
      ) : null}
    </NganhHubEditContext.Provider>
  );
}

/** Gọi sau thao tác hub (upload, tạo ngành). */
export function useNganhHubRefresh() {
  const router = useRouter();
  return useCallback(() => router.refresh(), [router]);
}
