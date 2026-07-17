"use client";

import { BarChart3, ExternalLink, Link2, MoreVertical, Pin, PinOff, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import { JourneyMilestoneInsightsModal } from "@/components/journey/JourneyMilestoneInsightsModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { resolveOrgBaiDangLoaiForWrite } from "@/lib/truong/bai-dang";
import { mapOrgBaiDangApiRow } from "@/lib/truong/bai-dang-api-fields";
import {
  baiDangTaoLucFromDateInput,
  sortBaiDangByTaoLuc,
} from "@/lib/truong/bai-dang-timeline";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import { orgBaiDangAbsolutePermalink, orgBaiDangPermalinkForSchool } from "@/lib/truong/org-bai-dang-permalink";
import type { TruongBaiDang } from "@/lib/truong/types";

type BaiDangActionsCtx = {
  remove: (id: string) => void;
  updateTaoLuc: (id: string, dateValue: string) => Promise<void>;
  updateLoaiBaiDang: (id: string, loai: string) => Promise<void>;
  updatePersonalFilters: (id: string, filterIds: string[]) => Promise<void>;
  updateGhim: (id: string, ghim: boolean) => Promise<void>;
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
      if (!ctx || !confirm("Xóa bài đăng này?")) return;
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
        ctx.showToast(await readTruongInlineError(res));
      } else {
        ctx.showToast("Đã xóa bài đăng");
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
          list.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...post,
                  noiDungBlocks: post.noiDungBlocks ?? p.noiDungBlocks,
                  personalFilters: p.personalFilters,
                  personalFilterSlugs: p.personalFilterSlugs,
                }
              : p,
          ),
        ),
      );
    },
    [ctx],
  );

  const updateLoaiBaiDang = useCallback(
    async (id: string, loai: string) => {
      if (!ctx) return;
      // Passthrough giữ giá trị đặc thù (vd. `showcase` cho studio) thay vì
      // normalize về 5 loại chuẩn (showcase sẽ bị quy về su_kien).
      const normalized = resolveOrgBaiDangLoaiForWrite(loai);
      const current = ctx.baidang.find((p) => p.id === id);
      if (resolveOrgBaiDangLoaiForWrite(current?.loai_bai_dang) === normalized) {
        return;
      }

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
                noiDungBlocks: post.noiDungBlocks ?? p.noiDungBlocks,
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

  const updateGhim = useCallback(
    async (id: string, ghim: boolean) => {
      if (!ctx) return;
      const current = ctx.baidang.find((p) => p.id === id);
      if (Boolean(current?.ghim) === ghim) return;

      const prev = ctx.baidang;
      ctx.setBaidang((list) =>
        sortBaiDangByTaoLuc(
          list.map((p) => (p.id === id ? { ...p, ghim } : p)),
        ),
      );

      const res = await truongInlineFetch(ctx.orgId, `/bai-dang/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ghim }),
      });

      if (!res.ok) {
        ctx.setBaidang(prev);
        ctx.showToast("Cập nhật ghim thất bại");
        return;
      }

      const json = (await res.json()) as {
        post: Parameters<typeof mapOrgBaiDangApiRow>[0];
      };
      const mapped = mapOrgBaiDangApiRow(json.post);
      ctx.setBaidang((list) =>
        sortBaiDangByTaoLuc(
          list.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...mapped,
                  noiDungBlocks: mapped.noiDungBlocks ?? p.noiDungBlocks,
                  personalFilters: p.personalFilters,
                  personalFilterSlugs: p.personalFilterSlugs,
                }
              : p,
          ),
        ),
      );
      ctx.showToast(ghim ? "Đã ghim bài đăng" : "Đã bỏ ghim");
    },
    [ctx],
  );

  /* Menu kebab (mở / copy / ghim / sửa / xóa) hiện khi canEdit —
   * không phụ thuộc editMode bật/tắt — khớp JourneyMilestoneOwnerMenu. */
  if (!ctx?.canEdit) {
    return <>{children}</>;
  }

  return (
    <BaiDangActionsContext.Provider
      value={{
        remove,
        updateTaoLuc,
        updateLoaiBaiDang,
        updatePersonalFilters,
        updateGhim,
      }}
    >
      {children}
    </BaiDangActionsContext.Provider>
  );
}

/**
 * Kebab (nút 3 chấm) gom các thao tác bài đăng vào một popover — dễ mở rộng
 * thêm mục về sau. Tái dùng style `j-m-menu-*` từ journey.css (đã nạp chung
 * trên trang chi tiết trường / cơ sở).
 */
export function TruongBaiDangPostActions({ post }: { post: TruongBaiDang }) {
  const actions = useBaiDangActions();
  const compose = useJourneyCompose();
  const inline = useTruongInlineEdit();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const postHref =
    inline?.school != null
      ? orgBaiDangPermalinkForSchool(inline.school, post.id, pathname)
      : null;

  function copyLink() {
    if (!inline?.school) return;
    const full = orgBaiDangAbsolutePermalink(inline.school, post.id, pathname);
    try {
      navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Sao chép URL bài đăng:", full);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!actions) return null;

  return (
    <div
      className="j-m-menu jcard-date-menu tdh-baidang-edit"
      ref={rootRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="j-m-menu-btn tdh-baidang-menu-btn"
        aria-label="Mở menu bài đăng"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreVertical size={18} strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <div className="j-m-menu-pop" role="menu">
          {postHref ? (
            <Link
              href={postHref}
              className="j-m-menu-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <ExternalLink size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">Mở bài viết</span>
            </Link>
          ) : null}
          {postHref ? (
            <button
              type="button"
              className="j-m-menu-item"
              role="menuitem"
              onClick={() => copyLink()}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <Link2 size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">
                {copied ? "Đã sao chép link!" : "Sao chép link"}
              </span>
            </button>
          ) : null}
          {post.ghim ? (
            <button
              type="button"
              className="j-m-menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void actions.updateGhim(post.id, false);
              }}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <PinOff size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">Bỏ ghim</span>
            </button>
          ) : (
            <button
              type="button"
              className="j-m-menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void actions.updateGhim(post.id, true);
              }}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <Pin size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">Ghim</span>
            </button>
          )}
          {compose.canCompose ? (
            <button
              type="button"
              className="j-m-menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                compose.openCompose({ kind: "edit", postSlug: post.id });
              }}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <Pencil size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">Sửa bài</span>
            </button>
          ) : null}
          <button
            type="button"
            className="j-m-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setInsightsOpen(true);
            }}
          >
            <span className="j-m-menu-ico" aria-hidden>
              <BarChart3 size={14} strokeWidth={1.7} />
            </span>
            <span className="j-m-menu-lbl">Số liệu tiếp cận</span>
          </button>
          <button
            type="button"
            className="j-m-menu-item is-danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void actions.remove(post.id);
            }}
          >
            <span className="j-m-menu-ico" aria-hidden>
              <Trash2 size={14} strokeWidth={1.7} />
            </span>
            <span className="j-m-menu-lbl">Xóa bài</span>
          </button>
        </div>
      ) : null}

      <JourneyMilestoneInsightsModal
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        subject={{ loai: "org_bai_dang", id: post.id }}
      />
    </div>
  );
}
