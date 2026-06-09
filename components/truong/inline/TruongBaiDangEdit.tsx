"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import type { TruongBaiDang } from "@/lib/truong/types";

type BaiDangActionsCtx = {
  remove: (id: string) => void;
};

const BaiDangActionsContext = createContext<BaiDangActionsCtx | null>(null);

export function useBaiDangActions(): BaiDangActionsCtx | null {
  return useContext(BaiDangActionsContext);
}

/** Provider ẩn/xóa bài đăng — tạo mới dùng `JourneyComposeProvider` + overlay. */
export function TruongBaiDangEditProvider({ children }: { children: ReactNode }) {
  const ctx = useTruongInlineEdit();

  const remove = useCallback(
    async (id: string) => {
      if (!ctx || !confirm("Ẩn bài đăng này?")) return;
      const prev = ctx.baidang;
      ctx.setBaidang((list) => list.filter((p) => p.id !== id));
      const res = await truongInlineFetch(ctx.orgId, `/bai-dang/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        ctx.setBaidang(prev);
        ctx.showToast("Ẩn bài thất bại");
      } else {
        ctx.showToast("Đã ẩn bài đăng");
      }
    },
    [ctx],
  );

  if (!ctx?.isEditing) {
    return <>{children}</>;
  }

  return (
    <BaiDangActionsContext.Provider value={{ remove }}>
      {children}
    </BaiDangActionsContext.Provider>
  );
}

export function TruongBaiDangPostActions({ post }: { post: TruongBaiDang }) {
  const actions = useBaiDangActions();
  if (!actions) return null;

  return (
    <div className="tdh-baidang-edit" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="tdh-inline-chip-btn danger"
        onClick={() => void actions.remove(post.id)}
      >
        Ẩn
      </button>
    </div>
  );
}
