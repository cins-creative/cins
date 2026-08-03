"use client";

import { Building2, Check, ChevronDown, MessageCircle, ShoppingBag, Store } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import {
  ModuleCard,
  ModuleEmpty,
} from "@/components/cins/home-adaptive/ModuleCard";
import { useDraftModuleItemLimit } from "@/components/cins/home-adaptive/draft-module-limit";
import { avatarBg } from "@/lib/chat/avatar";
import { resolveRoomTagColor } from "@/lib/chat/tag-colors";
import type { ChatThread, ChatThreadGroup } from "@/lib/chat/types";
import type { ModuleId } from "@/lib/cins/home-adaptive/persona";
import type { ShopKhachHangTag } from "@/lib/shop/khach-hang-types";

type Variant = "ban_be" | "to_chuc" | "mua_ban";

const VARIANT_MODULE_ID: Record<Variant, ModuleId> = {
  ban_be: "tin_nhan_ban_be",
  to_chuc: "tin_nhan_to_chuc",
  mua_ban: "tin_nhan_mua_ban",
};

const META: Record<
  Variant,
  {
    title: string;
    icon: typeof MessageCircle;
    empty: string;
    filter: (t: ChatThread) => boolean;
    openTab?: ChatThreadGroup;
  }
> = {
  ban_be: {
    title: "Tin nhắn bạn bè",
    icon: MessageCircle,
    empty: "Chưa có tin nhắn bạn bè.",
    filter: (t) => t.group === "ban_be" && !t.isKhachHang && !t.isMuaHang,
    openTab: "ban_be",
  },
  to_chuc: {
    title: "Tin nhắn tổ chức",
    icon: Building2,
    empty: "Chưa có hội thoại tổ chức.",
    filter: (t) => t.group === "to_chuc",
    openTab: "to_chuc",
  },
  mua_ban: {
    title: "Tin nhắn mua bán",
    icon: ShoppingBag,
    empty: "Chưa có chat mua bán.",
    filter: (t) => Boolean(t.isKhachHang || t.isMuaHang),
  },
};

const AVATAR_SIZE = 40;

function ModuleChatAvatar({
  thread,
  shop,
}: {
  thread: ChatThread;
  shop?: boolean;
}) {
  const initial =
    thread.avatarInitial || thread.name.trim().slice(0, 1).toUpperCase() || "?";
  const hue = thread.avatarHue ?? 210;
  const badgeSize = Math.max(14, Math.round(AVATAR_SIZE * 0.34));
  const iconSize = Math.max(8, Math.round(badgeSize * 0.58));

  return (
    <span className={`cins-chat-avatar-wrap${shop ? " is-shop" : ""}`}>
      <span
        className={`cins-chat-avatar${thread.kind === "org" ? " is-org" : ""}${thread.avatarUrl ? " has-image" : ""}`}
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          fontSize: AVATAR_SIZE * 0.38,
          background: thread.avatarUrl ? "transparent" : avatarBg(hue),
        }}
        aria-hidden
      >
        {thread.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={thread.avatarUrl} alt="" />
        ) : (
          initial
        )}
      </span>
      {shop ? (
        <span
          className="cins-chat-avatar-shop"
          aria-label="Shop"
          title="Shop"
          style={{ width: badgeSize, height: badgeSize }}
        >
          <Store size={iconSize} strokeWidth={2.4} aria-hidden />
        </span>
      ) : null}
    </span>
  );
}

const PREVIEW_CTX_PREFIX = /^Trao đổi về:\s*/i;

function displayThreadPreview(raw: string | null | undefined): string {
  const text = raw?.trim() || "";
  if (!text) return "—";
  return text.replace(PREVIEW_CTX_PREFIX, "").trim() || text;
}

function ModuleChatThreadRow({
  thread,
  shop,
  tagChip,
  onOpen,
}: {
  thread: ChatThread;
  shop?: boolean;
  tagChip?: ReactNode;
  onOpen: () => void;
}) {
  const preview = displayThreadPreview(thread.preview);
  const mainClass = [
    "cins-chat-thread-main",
    shop && thread.isKhachHang ? "is-khach-card" : "",
    shop && thread.isMuaHang && !thread.isKhachHang ? "is-mua-card" : "",
    thread.kind === "org" ? "is-org-card" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className="cins-chat-thread"
      onClick={onOpen}
      aria-label={`Mở chat với ${thread.name}`}
    >
      <ModuleChatAvatar thread={thread} shop={shop} />
      <span className={mainClass}>
        <span className="cins-chat-thread-top">
          <span className="cins-chat-thread-name">
            <strong title={thread.name}>{thread.name}</strong>
          </span>
        </span>
        <span className="cins-chat-thread-bottom">
          <span className="cins-chat-thread-preview" title={preview}>
            {preview}
          </span>
          {tagChip || thread.unread > 0 ? (
            <span className="cins-chat-thread-trailing">
              {thread.unread > 0 ? (
                <span className="cins-chat-unread">{thread.unread}</span>
              ) : null}
              {tagChip}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function KhachHangTagChip({
  thread,
  tags,
}: {
  thread: ChatThread;
  tags: ShopKhachHangTag[];
}) {
  if (!thread.isKhachHang) return null;
  const tagId = thread.khachHangTagIds?.[0];
  if (!tagId) return null;
  const tag = tags.find((t) => t.id === tagId);
  if (!tag) return null;
  const color = resolveRoomTagColor(tag.id, tag.mau);
  return (
    <span
      className="cins-chat-khach-tag-chip"
      style={{ color }}
      title={tag.ten}
    >
      {tag.ten}
    </span>
  );
}

/** Multi-select thẻ khách hàng — gọn cho sidebar. */
function KhachHangTagFilterDropdown({
  tags,
  selected,
  onChange,
}: {
  tags: ShopKhachHangTag[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = useMemo(() => {
    if (selected.length === 0) return "Tất cả thẻ";
    if (selected.length === 1) {
      return tags.find((t) => t.id === selected[0])?.ten ?? "1 thẻ";
    }
    return `${selected.length} thẻ`;
  }, [selected, tags]);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  };

  return (
    <div
      className={`ha-chat-tag-filter${open ? " is-open" : ""}`}
      ref={wrapRef}
    >
      <button
        type="button"
        className="ha-chat-tag-filter-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Lọc theo thẻ khách hàng"
        title="Lọc theo thẻ"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ha-chat-tag-filter-label">{label}</span>
        <ChevronDown size={12} strokeWidth={2.5} aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          className="ha-chat-tag-filter-menu"
          role="listbox"
          aria-multiselectable
          aria-label="Chọn thẻ khách hàng"
        >
          <button
            type="button"
            className={`ha-chat-tag-filter-option${selected.length === 0 ? " is-active" : ""}`}
            onClick={() => onChange([])}
          >
            <span className="ha-chat-tag-filter-check" aria-hidden>
              {selected.length === 0 ? (
                <Check size={12} strokeWidth={2.8} />
              ) : null}
            </span>
            <span>Tất cả thẻ</span>
          </button>
          {tags.map((tag) => {
            const color = resolveRoomTagColor(tag.id, tag.mau);
            const active = selected.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`ha-chat-tag-filter-option${active ? " is-active" : ""}`}
                onClick={() => toggle(tag.id)}
              >
                <span className="ha-chat-tag-filter-check" aria-hidden>
                  {active ? <Check size={12} strokeWidth={2.8} /> : null}
                </span>
                <span
                  className="cins-chat-khach-tag-dot"
                  style={{ background: color }}
                  aria-hidden
                />
                <span className="ha-chat-tag-filter-name" style={{ color }}>
                  {tag.ten}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function TinNhanModuleClient({
  variant,
  limit = 5,
}: {
  variant: Variant;
  limit?: number;
}) {
  const { getCachedThreads, prefetchChatData, openChat } = useCinsChat();
  const liveLimit = useDraftModuleItemLimit(
    VARIANT_MODULE_ID[variant],
    limit,
  );
  const [threads, setThreads] = useState<ChatThread[]>(
    () => getCachedThreads()?.threads ?? [],
  );
  const [khachHangTags, setKhachHangTags] = useState<ShopKhachHangTag[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedThreads()?.threads;
    if (cached && cached.length > 0) {
      setThreads(cached);
      return;
    }
    void prefetchChatData().then((snap) => {
      if (!cancelled && snap?.threads) setThreads(snap.threads);
    });
    return () => {
      cancelled = true;
    };
  }, [getCachedThreads, prefetchChatData]);

  useEffect(() => {
    if (variant !== "mua_ban") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/shop/khach-hang/the", {
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          enabled?: boolean;
          tags?: ShopKhachHangTag[];
        };
        if (cancelled || data.enabled === false) return;
        setKhachHangTags(Array.isArray(data.tags) ? data.tags : []);
      } catch {
        /* ignore — list vẫn dùng được không thẻ */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [variant]);

  const meta = META[variant];
  const rowLimit = Math.min(10, Math.max(1, Math.round(liveLimit)));
  const isMuaBan = variant === "mua_ban";

  const rows = useMemo(() => {
    return threads
      .filter(meta.filter)
      .filter((t) => {
        if (!isMuaBan || tagFilter.length === 0) return true;
        if (!t.isKhachHang) return false;
        const ids = t.khachHangTagIds ?? [];
        return tagFilter.some((id) => ids.includes(id));
      })
      .sort((a, b) => {
        if ((b.unread || 0) !== (a.unread || 0)) {
          return (b.unread || 0) - (a.unread || 0);
        }
        return (b.lastAt || "").localeCompare(a.lastAt || "");
      })
      .slice(0, rowLimit);
  }, [threads, meta, rowLimit, isMuaBan, tagFilter]);

  const unread = rows.reduce((s, t) => s + (t.unread || 0), 0);
  const Icon = meta.icon;
  const showFilters = isMuaBan && khachHangTags.length > 0;

  const open = (thread?: ChatThread) => {
    void openChat(
      thread
        ? { roomId: thread.roomId, thread, tab: meta.openTab }
        : { tab: meta.openTab },
    );
  };

  const tagFilterNode = showFilters ? (
    <KhachHangTagFilterDropdown
      tags={khachHangTags}
      selected={tagFilter}
      onChange={setTagFilter}
    />
  ) : null;

  if (rows.length === 0 && !showFilters) {
    return (
      <ModuleCard icon={Icon} title={meta.title} className="ha-card--chat">
        <ModuleEmpty>{meta.empty}</ModuleEmpty>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard
      icon={Icon}
      title={meta.title}
      badge={unread > 0 ? String(unread) : undefined}
      headTrailing={tagFilterNode}
      className="ha-card--chat"
    >
      {rows.length === 0 ? (
        <ModuleEmpty>
          {tagFilter.length > 0
            ? "Không có hội thoại khớp thẻ đã chọn."
            : meta.empty}
        </ModuleEmpty>
      ) : (
        <div className="ha-chat-list" role="list">
          {rows.map((t) => (
            <div key={t.roomId} role="listitem">
              <ModuleChatThreadRow
                thread={t}
                shop={false}
                tagChip={
                  isMuaBan ? (
                    <KhachHangTagChip thread={t} tags={khachHangTags} />
                  ) : null
                }
                onOpen={() => open(t)}
              />
            </div>
          ))}
        </div>
      )}
    </ModuleCard>
  );
}

export function TinNhanBanBeModule({ limit }: { limit?: number }) {
  return <TinNhanModuleClient variant="ban_be" limit={limit} />;
}

export function TinNhanToChucModule({ limit }: { limit?: number }) {
  return <TinNhanModuleClient variant="to_chuc" limit={limit} />;
}

export function TinNhanMuaBanModule({ limit }: { limit?: number }) {
  return <TinNhanModuleClient variant="mua_ban" limit={limit} />;
}
