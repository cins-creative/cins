"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";

import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { normalizeLoaiBaiDang, type BaiDangLoai } from "@/lib/truong/bai-dang";
import { mapOrgBaiDangApiRow } from "@/lib/truong/bai-dang-api-fields";
import {
  baiDangTaoLucFromDateInput,
  sortBaiDangByTaoLuc,
} from "@/lib/truong/bai-dang-timeline";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import type { TruongBaiDang } from "@/lib/truong/types";

type BaiDangActionsCtx = {
  remove: (id: string) => void;
  updateTaoLuc: (id: string, dateValue: string) => Promise<void>;
  updateLoaiBaiDang: (id: string, loai: BaiDangLoai) => Promise<void>;
  updatePersonalFilters: (id: string, filterIds: string[]) => Promise<void>;
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
      const prevScheduled = ctx.scheduledBaidang;
      ctx.setBaidang((list) => list.filter((p) => p.id !== id));
      ctx.setScheduledBaidang((list) => list.filter((p) => p.id !== id));
      const res = await truongInlineFetch(ctx.orgId, `/bai-dang/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        ctx.setBaidang(prev);
        ctx.setScheduledBaidang(prevScheduled);
        ctx.showToast("Ẩn bài thất bại");
      } else {
        ctx.showToast("Đã ẩn bài đăng");
      }
    },
    [ctx],
  );

  const updateTaoLuc = useCallback(
    async (id: string, dateValue: string) => {
      if (!ctx) return;
      const current = ctx.baidang.find((p) => p.id === id);
      const iso = baiDangTaoLucFromDateInput(dateValue, current?.tao_luc);
      if (!iso || iso === current?.tao_luc) return;

      const prev = ctx.baidang;
      ctx.setBaidang((list) =>
        sortBaiDangByTaoLuc(
          list.map((p) => (p.id === id ? { ...p, tao_luc: iso } : p)),
        ),
      );

      const res = await truongInlineFetch(ctx.orgId, `/bai-dang/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ tao_luc: iso }),
      });

      if (!res.ok) {
        ctx.setBaidang(prev);
        ctx.showToast("Cập nhật ngày đăng thất bại");
        return;
      }

      const json = (await res.json()) as {
        post: Parameters<typeof mapOrgBaiDangApiRow>[0];
      };
      const post = mapOrgBaiDangApiRow(json.post);
      ctx.setBaidang((list) =>
        sortBaiDangByTaoLuc(
          list.map((p) => (p.id === id ? { ...p, ...post } : p)),
        ),
      );
    },
    [ctx],
  );

  const updateLoaiBaiDang = useCallback(
    async (id: string, loai: BaiDangLoai) => {
      if (!ctx) return;
      const normalized = normalizeLoaiBaiDang(loai);
      const current = ctx.baidang.find((p) => p.id === id);
      if (normalizeLoaiBaiDang(current?.loai_bai_dang) === normalized) return;

      const prev = ctx.baidang;
      ctx.setBaidang((list) =>
        list.map((p) =>
          p.id === id ? { ...p, loai_bai_dang: normalized } : p,
        ),
      );

      const res = await truongInlineFetch(ctx.orgId, `/bai-dang/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ loai_bai_dang: normalized }),
      });

      if (!res.ok) {
        ctx.setBaidang(prev);
        ctx.showToast("Cập nhật loại bài đăng thất bại");
        return;
      }

      const json = (await res.json()) as {
        post: Parameters<typeof mapOrgBaiDangApiRow>[0];
      };
      const post = mapOrgBaiDangApiRow(json.post);
      ctx.setBaidang((list) =>
        list.map((p) =>
          p.id === id
            ? {
                ...p,
                ...post,
                personalFilters: p.personalFilters,
                personalFilterSlugs: p.personalFilterSlugs,
              }
            : p,
        ),
      );
    },
    [ctx],
  );

  const updatePersonalFilters = useCallback(
    async (id: string, filterIds: string[]) => {
      if (!ctx) return;
      const current = ctx.baidang.find((p) => p.id === id);
      const prevIds = (current?.personalFilters ?? []).map((f) => f.id);
      const same =
        prevIds.length === filterIds.length &&
        prevIds.every((fid) => filterIds.includes(fid));
      if (same) return;

      const prev = ctx.baidang;

      const res = await truongInlineFetch(ctx.orgId, `/bai-dang/${id}/filters`, {
        method: "PUT",
        body: JSON.stringify({ filterIds }),
      });

      if (!res.ok) {
        ctx.setBaidang(prev);
        ctx.showToast("Cập nhật nhãn thất bại");
        return;
      }

      const json = (await res.json()) as {
        filters?: TruongBaiDang["personalFilters"];
        personalFilterSlugs?: string[];
      };
      ctx.setBaidang((list) =>
        list.map((p) =>
          p.id === id
            ? {
                ...p,
                personalFilters: json.filters ?? [],
                personalFilterSlugs: json.personalFilterSlugs ?? [],
              }
            : p,
        ),
      );
    },
    [ctx],
  );

  if (!ctx?.isEditing) {
    return <>{children}</>;
  }

  return (
    <BaiDangActionsContext.Provider
      value={{ remove, updateTaoLuc, updateLoaiBaiDang, updatePersonalFilters }}
    >
      {children}
    </BaiDangActionsContext.Provider>
  );
}

export function TruongBaiDangPostActions({ post }: { post: TruongBaiDang }) {
  const actions = useBaiDangActions();
  const compose = useJourneyCompose();
  if (!actions) return null;

  return (
    <div className="tdh-baidang-edit" onClick={(e) => e.stopPropagation()}>
      {compose.canCompose ? (
        <button
          type="button"
          className="tdh-inline-chip-btn"
          onClick={() =>
            compose.openCompose({ kind: "edit", postSlug: post.id })
          }
        >
          Sửa bài
        </button>
      ) : null}
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
