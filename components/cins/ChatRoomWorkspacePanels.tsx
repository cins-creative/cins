"use client";

import { Link2, Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  resolveRoomTagColor,
  roomTagChipStyle,
} from "@/lib/chat/tag-colors";

type TagRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thuTu: number;
};

type ResourceItem = {
  messageId: string;
  body: string;
  sentAt: string;
  imageUrl: string | null;
  urls: string[];
  tagIds: string[];
};

type MocRow = {
  id: string;
  ten: string;
  moTa: string | null;
  thoiDiem: string;
  url: string | null;
  nhacTruocPhut: number;
};

type RemindUnit = "ngay" | "gio" | "phut";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5);

function formatMocDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const hasTime =
    iso.includes("T") &&
    (d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(hasTime
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : {}),
  });
}

function formatRemindLabel(minutes: number): string {
  if (minutes <= 0) return "Nhắc đúng lúc";
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `Nhắc trước ${days} ngày`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `Nhắc trước ${hours} giờ`;
  }
  return `Nhắc trước ${minutes} phút`;
}

/** «Còn X ngày Y giờ…» — ms tới thoi_diem. */
function formatRemaining(ms: number): string {
  if (ms <= 0) return "Đã đến hạn";
  const totalMin = Math.max(1, Math.ceil(ms / 60_000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (days === 0 && (mins > 0 || parts.length === 0)) {
    parts.push(`${mins} phút`);
  }
  return `Còn ${parts.join(" ")}`;
}

function remindToMinutes(amount: number, unit: RemindUnit): number {
  const n = Math.max(0, Math.floor(amount) || 0);
  if (unit === "ngay") return n * 1440;
  if (unit === "gio") return n * 60;
  return n;
}

function buildThoiDiemPayload(
  date: string,
  withTime: boolean,
  hour: number,
  minute: number,
): string {
  if (!date) return "";
  if (!withTime) return date;
  const hh = String(Math.max(0, Math.min(23, hour))).padStart(2, "0");
  const mm = String(Math.max(0, Math.min(59, minute))).padStart(2, "0");
  return `${date}T${hh}:${mm}:00`;
}

type MocDraft = {
  ten: string;
  moTa: string;
  ngay: string;
  withTime: boolean;
  gio: number;
  phut: number;
  nhacSo: number;
  nhacDonVi: RemindUnit;
};

const EMPTY_MOC_DRAFT: MocDraft = {
  ten: "",
  moTa: "",
  ngay: "",
  withTime: false,
  gio: 9,
  phut: 0,
  nhacSo: 1,
  nhacDonVi: "ngay",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function minutesToRemindParts(minutes: number): {
  amount: number;
  unit: RemindUnit;
} {
  if (minutes <= 0) return { amount: 0, unit: "phut" };
  if (minutes % 1440 === 0) {
    return { amount: minutes / 1440, unit: "ngay" };
  }
  if (minutes % 60 === 0) {
    return { amount: minutes / 60, unit: "gio" };
  }
  return { amount: minutes, unit: "phut" };
}

function mocToDraft(moc: MocRow): MocDraft {
  const d = new Date(moc.thoiDiem.includes("T") ? moc.thoiDiem : `${moc.thoiDiem}T00:00:00`);
  const ngay = Number.isNaN(d.getTime())
    ? moc.thoiDiem.slice(0, 10)
    : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const gio = Number.isNaN(d.getTime()) ? 9 : d.getHours();
  const phut = Number.isNaN(d.getTime()) ? 0 : d.getMinutes();
  const withTime = !Number.isNaN(d.getTime()) && (gio !== 0 || phut !== 0);
  const remind = minutesToRemindParts(moc.nhacTruocPhut ?? 0);
  return {
    ten: moc.ten,
    moTa: moc.moTa ?? "",
    ngay,
    withTime,
    gio,
    phut,
    nhacSo: remind.amount,
    nhacDonVi: remind.unit,
  };
}

function minuteSelectOptions(current: number): number[] {
  if (MINUTE_OPTIONS.includes(current)) return MINUTE_OPTIONS;
  return [...MINUTE_OPTIONS, current].sort((a, b) => a - b);
}

export function ChatRoomResourcesPanel({
  roomId,
  onJumpToMessage,
}: {
  roomId: string;
  onJumpToMessage?: (messageId: string) => void;
}) {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  /** Chỉ mở picker gắn thẻ cho 1 tài nguyên — tránh liệt kê hết thẻ mọi hàng. */
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const load = useCallback(
    async (tagId: string | null) => {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams({ resources: "1" });
      if (tagId) qs.set("tag", tagId);
      const res = await fetch(
        `/api/chat/rooms/${roomId}/tags?${qs.toString()}`,
      );
      const json = (await res.json().catch(() => null)) as {
        tags?: TagRow[];
        items?: ResourceItem[];
        error?: string;
      } | null;
      if (!res.ok) {
        setError(json?.error ?? "Không tải được tài nguyên.");
        setLoading(false);
        return;
      }
      setTags(json?.tags ?? []);
      setItems(json?.items ?? []);
      setLoading(false);
    },
    [roomId],
  );

  useEffect(() => {
    setEditingMessageId(null);
    void load(filterTagId);
  }, [filterTagId, load]);

  const createTag = () => {
    const ten = newTag.trim();
    if (!ten || pending) return;
    startTransition(async () => {
      const res = await fetch(`/api/chat/rooms/${roomId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten }),
      });
      const json = (await res.json().catch(() => null)) as {
        tag?: TagRow;
        error?: string;
      } | null;
      if (!res.ok || !json?.tag) {
        setError(json?.error ?? "Không tạo được thẻ.");
        return;
      }
      setNewTag("");
      setTags((prev) => [...prev, json.tag!]);
    });
  };

  const removeTag = (tagId: string) => {
    if (pending) return;
    if (!window.confirm("Xóa thẻ này? Gắn thẻ trên tin cũng bị gỡ.")) return;
    startTransition(async () => {
      const res = await fetch(`/api/chat/rooms/${roomId}/tags/${tagId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(json?.error ?? "Không xóa được thẻ.");
        return;
      }
      if (filterTagId === tagId) setFilterTagId(null);
      else void load(filterTagId);
    });
  };

  const tagById = useMemo(() => {
    const map = new Map(tags.map((t) => [t.id, t]));
    return map;
  }, [tags]);

  const tagColor = useCallback(
    (tag: TagRow | undefined, tagId: string) =>
      resolveRoomTagColor(tagId, tag?.mau),
    [],
  );

  const setItemTags = (messageId: string, next: string[]) => {
    startTransition(async () => {
      const res = await fetch(
        `/api/chat/rooms/${roomId}/messages/${messageId}/tags`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds: next }),
        },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(json?.error ?? "Không gắn được thẻ.");
        return;
      }
      setItems((prev) =>
        prev.map((row) =>
          row.messageId === messageId ? { ...row, tagIds: next } : row,
        ),
      );
    });
  };

  return (
    <div className="cins-chat-workspace-panel">
      <div className="cins-chat-workspace-tags">
        <button
          type="button"
          className={`cins-chat-workspace-tag${filterTagId == null ? " is-active" : ""}`}
          onClick={() => setFilterTagId(null)}
        >
          Tất cả
        </button>
        {tags.map((tag) => {
          const color = tagColor(tag, tag.id);
          const active = filterTagId === tag.id;
          return (
            <button
              key={tag.id}
              type="button"
              className={`cins-chat-workspace-tag${active ? " is-active" : ""}`}
              onClick={() => setFilterTagId(tag.id)}
              style={roomTagChipStyle(color, { active })}
            >
              <span
                className="cins-chat-workspace-tag-dot"
                style={{ background: active ? "#fff" : color }}
                aria-hidden
              />
              {tag.ten}
              <span
                className="cins-chat-workspace-tag-x"
                role="button"
                tabIndex={0}
                aria-label={`Xóa thẻ ${tag.ten}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    removeTag(tag.id);
                  }
                }}
              >
                ×
              </span>
            </button>
          );
        })}
      </div>

      <div className="cins-chat-workspace-add-tag">
        <input
          type="text"
          value={newTag}
          maxLength={40}
          placeholder="Tạo thẻ mới…"
          aria-label="Tên thẻ mới"
          disabled={pending}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              createTag();
            }
          }}
        />
        <button
          type="button"
          className="cins-chat-icon-btn"
          aria-label="Tạo thẻ"
          disabled={pending || !newTag.trim()}
          onClick={createTag}
        >
          {pending ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
        </button>
      </div>

      {error ? <p className="cins-chat-side-empty">{error}</p> : null}
      {loading ? (
        <p className="cins-chat-side-empty">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="cins-chat-side-empty">
          Chưa có ảnh/URL trong hội thoại. Gửi link hoặc ảnh rồi gắn thẻ để lọc.
        </p>
      ) : (
        <ul className="cins-chat-workspace-resources" role="list">
          {items.map((item) => (
            <li key={item.messageId} className="cins-chat-workspace-resource">
              <button
                type="button"
                className="cins-chat-workspace-resource-main"
                onClick={() => onJumpToMessage?.(item.messageId)}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" />
                ) : (
                  <span className="cins-chat-workspace-resource-link-icon" aria-hidden>
                    <Link2 size={16} />
                  </span>
                )}
                <div>
                  <p>
                    {item.body.trim() ||
                      (item.imageUrl ? "Ảnh đính kèm" : item.urls[0] || "Tài nguyên")}
                  </p>
                  {item.urls.length > 0 ? (
                    <a
                      href={item.urls[0]}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.urls[0]}
                    </a>
                  ) : null}
                </div>
              </button>
              <div className="cins-chat-workspace-resource-tag-row">
                {item.tagIds.length > 0 ? (
                  <div className="cins-chat-workspace-resource-tags">
                    {item.tagIds.map((id) => {
                      const tag = tagById.get(id);
                      const color = tagColor(tag, id);
                      return (
                        <span key={id} style={{ color }}>
                          {tag?.ten ?? "Thẻ"}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="cins-chat-workspace-resource-untagged">
                    Chưa gắn thẻ
                  </p>
                )}
                {tags.length > 0 && editingMessageId !== item.messageId ? (
                  <button
                    type="button"
                    className="cins-chat-workspace-resource-tag-toggle"
                    disabled={pending}
                    aria-label={
                      item.tagIds.length > 0 ? "Đổi thẻ" : "Gắn thẻ"
                    }
                    title={item.tagIds.length > 0 ? "Đổi thẻ" : "Gắn thẻ"}
                    onClick={() => setEditingMessageId(item.messageId)}
                  >
                    <Tag size={14} aria-hidden />
                  </button>
                ) : null}
              </div>
              {tags.length > 0 && editingMessageId === item.messageId ? (
                <div className="cins-chat-workspace-resource-tag-edit">
                  <div className="cins-chat-workspace-resource-tag-picker">
                    {tags.map((tag) => {
                      const on = item.tagIds.includes(tag.id);
                      const color = tagColor(tag, tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className={`cins-chat-workspace-tag is-compact${on ? " is-active" : ""}`}
                          disabled={pending}
                          style={roomTagChipStyle(color, { active: on })}
                          onClick={() => {
                            const next = on
                              ? item.tagIds.filter((id) => id !== tag.id)
                              : [...item.tagIds, tag.id];
                            setItemTags(item.messageId, next);
                          }}
                        >
                          <span
                            className="cins-chat-workspace-tag-dot"
                            style={{
                              background: on ? "#fff" : color,
                            }}
                            aria-hidden
                          />
                          {tag.ten}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="cins-chat-workspace-resource-tag-done"
                    onClick={() => setEditingMessageId(null)}
                  >
                    Xong
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChatRoomMocsPanel({
  roomId,
  canManage,
  openFormKey = 0,
  onNotice,
  onNoticesRemoved,
}: {
  roomId: string;
  canManage: boolean;
  /** Tăng giá trị từ ngoài để mở form thêm mốc. */
  openFormKey?: number;
  /** Tin nhắc mốc vừa tạo — append vào thread. */
  onNotice?: (message: import("@/lib/chat/types").ChatMessage) => void;
  /** Xóa tin nhắc (vd. khi đã đến hạn). */
  onNoticesRemoved?: (messageIds: string[]) => void;
}) {
  const [mocs, setMocs] = useState<MocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<MocDraft>(EMPTY_MOC_DRAFT);
  const [showForm, setShowForm] = useState(false);
  const [editingMocId, setEditingMocId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showPastMocs, setShowPastMocs] = useState(false);

  useEffect(() => {
    if (openFormKey > 0 && canManage) {
      setEditingMocId(null);
      setDraft(EMPTY_MOC_DRAFT);
      setShowForm(true);
    }
  }, [openFormKey, canManage]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/chat/rooms/${roomId}/mocs`);
    const json = (await res.json().catch(() => null)) as {
      mocs?: MocRow[];
      error?: string;
    } | null;
    if (!res.ok) {
      setError(json?.error ?? "Không tải được mốc.");
      setLoading(false);
      return;
    }
    setMocs(json?.mocs ?? []);
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeForm = () => {
    setShowForm(false);
    setEditingMocId(null);
    setDraft(EMPTY_MOC_DRAFT);
  };

  const beginCreate = () => {
    setEditingMocId(null);
    setDraft(EMPTY_MOC_DRAFT);
    setShowForm(true);
    setError(null);
  };

  const beginEdit = (moc: MocRow) => {
    setEditingMocId(moc.id);
    setDraft(mocToDraft(moc));
    setShowForm(true);
    setError(null);
  };

  const saveMoc = () => {
    if (!canManage || pending) return;
    const thoiDiem = buildThoiDiemPayload(
      draft.ngay,
      draft.withTime,
      draft.gio,
      draft.phut,
    );
    if (!thoiDiem) return;
    const isEdit = Boolean(editingMocId);
    const body = {
      ten: draft.ten,
      mo_ta: draft.moTa || null,
      thoi_diem: thoiDiem,
      nhac_truoc_phut: remindToMinutes(draft.nhacSo, draft.nhacDonVi),
    };
    startTransition(async () => {
      const res = await fetch(
        isEdit
          ? `/api/chat/rooms/${roomId}/mocs/${editingMocId}`
          : `/api/chat/rooms/${roomId}/mocs`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        moc?: MocRow;
        notice?: import("@/lib/chat/types").ChatMessage | null;
        error?: string;
      } | null;
      if (!res.ok || !json?.moc) {
        setError(
          json?.error ??
            (isEdit ? "Không cập nhật được mốc." : "Không tạo được mốc."),
        );
        return;
      }
      const saved = json.moc;
      setMocs((prev) => {
        const next = isEdit
          ? prev.map((m) => (m.id === saved.id ? saved : m))
          : [...prev, saved];
        return next.sort((a, b) => a.thoiDiem.localeCompare(b.thoiDiem));
      });
      if (!isEdit && json.notice) {
        onNotice?.(json.notice);
      }
      // Sau tạo/sửa lịch: tick ngay để gửi nhắc nếu đã tới giờ (vd. nhắc 1 phút).
      void fetch("/api/chat/mocs/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      })
        .then(async (tickRes) => {
          if (!tickRes.ok) return;
          const tickJson = (await tickRes.json().catch(() => null)) as {
            messages?: import("@/lib/chat/types").ChatMessage[];
            removedMessageIds?: string[];
          } | null;
          for (const msg of tickJson?.messages ?? []) {
            onNotice?.(msg);
          }
          const removed = tickJson?.removedMessageIds ?? [];
          if (removed.length) onNoticesRemoved?.(removed);
        })
        .catch(() => undefined);
      closeForm();
    });
  };

  const removeMoc = (mocId: string) => {
    if (!canManage || pending) return;
    if (!window.confirm("Xóa mốc này?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/chat/rooms/${roomId}/mocs/${mocId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(json?.error ?? "Không xóa được mốc.");
        return;
      }
      if (editingMocId === mocId) closeForm();
      setMocs((prev) => prev.filter((m) => m.id !== mocId));
    });
  };

  const nowIso = new Date(nowMs).toISOString();

  const { upcomingMocs, pastMocs } = useMemo(() => {
    const upcoming = mocs
      .filter((m) => m.thoiDiem >= nowIso)
      .sort((a, b) => a.thoiDiem.localeCompare(b.thoiDiem));
    const past = mocs
      .filter((m) => m.thoiDiem < nowIso)
      .sort((a, b) => b.thoiDiem.localeCompare(a.thoiDiem));
    return { upcomingMocs: upcoming, pastMocs: past };
  }, [mocs, nowIso]);

  const topUpcomingId = upcomingMocs[0]?.id ?? null;
  const minuteOptions = minuteSelectOptions(draft.phut);

  const renderMocItem = (moc: MocRow, past: boolean) => {
    const isTopUpcoming = moc.id === topUpcomingId;
    const dueMs = new Date(moc.thoiDiem).getTime();
    const remindMs = dueMs - Math.max(0, moc.nhacTruocPhut ?? 0) * 60_000;
    const inRemindWindow =
      isTopUpcoming && nowMs >= remindMs && nowMs < dueMs;
    return (
      <li
        key={moc.id}
        className={[
          "cins-chat-workspace-moc",
          past ? "is-past" : "",
          editingMocId === moc.id ? "is-editing" : "",
          isTopUpcoming ? "is-next" : "",
          inRemindWindow ? "is-urgent" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="cins-chat-workspace-moc-dot" aria-hidden />
        <div className="cins-chat-workspace-moc-body">
          <div className="cins-chat-workspace-moc-when-line">
            <time dateTime={moc.thoiDiem}>{formatMocDate(moc.thoiDiem)}</time>
            {isTopUpcoming ? (
              <span
                className={`cins-chat-workspace-moc-remain${inRemindWindow ? " is-urgent" : ""}`}
              >
                {formatRemaining(dueMs - nowMs)}
              </span>
            ) : null}
          </div>
          <strong>{moc.ten}</strong>
          {moc.moTa ? <p>{moc.moTa}</p> : null}
          {moc.url ? (
            <a href={moc.url} target="_blank" rel="noreferrer">
              {moc.url}
            </a>
          ) : null}
          <span className="cins-chat-workspace-moc-remind-meta">
            {formatRemindLabel(moc.nhacTruocPhut ?? 0)}
          </span>
        </div>
        {canManage ? (
          <div className="cins-chat-workspace-moc-actions">
            <button
              type="button"
              className="cins-chat-workspace-moc-action"
              aria-label="Sửa mốc"
              disabled={pending}
              onClick={() => {
                if (past) setShowPastMocs(true);
                beginEdit(moc);
              }}
            >
              <Pencil size={14} strokeWidth={1.9} />
            </button>
            <button
              type="button"
              className="cins-chat-workspace-moc-action"
              aria-label="Xóa mốc"
              disabled={pending}
              onClick={() => removeMoc(moc.id)}
            >
              <Trash2 size={14} strokeWidth={1.9} />
            </button>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="cins-chat-workspace-panel">
      {canManage ? (
        showForm ? (
          <div className="cins-chat-workspace-moc-form">
            <p className="cins-chat-workspace-moc-form-title">
              {editingMocId ? "Sửa mốc" : "Thêm mốc"}
            </p>
            <input
              type="text"
              placeholder="Tên mốc"
              value={draft.ten}
              maxLength={120}
              onChange={(e) => setDraft((d) => ({ ...d, ten: e.target.value }))}
            />
            <div className="cins-chat-workspace-moc-when">
              <input
                type="date"
                value={draft.ngay}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, ngay: e.target.value }))
                }
                aria-label="Ngày mốc"
              />
              {draft.withTime ? (
                <div className="cins-chat-workspace-moc-time">
                  <select
                    aria-label="Giờ"
                    value={draft.gio}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        gio: Number(e.target.value),
                      }))
                    }
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {pad2(h)}
                      </option>
                    ))}
                  </select>
                  <span aria-hidden>:</span>
                  <select
                    aria-label="Phút"
                    value={draft.phut}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        phut: Number(e.target.value),
                      }))
                    }
                  >
                    {minuteOptions.map((m) => (
                      <option key={m} value={m}>
                        {pad2(m)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="cins-chat-workspace-moc-time-clear"
                    onClick={() =>
                      setDraft((d) => ({ ...d, withTime: false, phut: 0 }))
                    }
                  >
                    Bỏ giờ
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="cins-chat-workspace-moc-time-add"
                  disabled={!draft.ngay}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      withTime: true,
                      gio: d.gio || 9,
                      phut: d.phut || 0,
                    }))
                  }
                >
                  + Thêm giờ
                </button>
              )}
            </div>
            <textarea
              placeholder="Mô tả (tuỳ chọn)"
              value={draft.moTa}
              rows={2}
              onChange={(e) => setDraft((d) => ({ ...d, moTa: e.target.value }))}
            />
            <label className="cins-chat-workspace-moc-remind">
              Nhắc trước
              <input
                type="number"
                min={0}
                max={draft.nhacDonVi === "ngay" ? 30 : draft.nhacDonVi === "gio" ? 720 : 43200}
                value={draft.nhacSo}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    nhacSo: Number(e.target.value) || 0,
                  }))
                }
              />
              <select
                aria-label="Đơn vị nhắc"
                value={draft.nhacDonVi}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    nhacDonVi: e.target.value as RemindUnit,
                  }))
                }
              >
                <option value="ngay">ngày</option>
                <option value="gio">giờ</option>
                <option value="phut">phút</option>
              </select>
            </label>
            <div className="cins-chat-workspace-moc-form-actions">
              <button
                type="button"
                className="cins-chat-group-cancel"
                disabled={pending}
                onClick={closeForm}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cins-chat-group-submit"
                disabled={pending || !draft.ten.trim() || !draft.ngay}
                onClick={saveMoc}
              >
                {pending ? <Loader2 size={14} className="spin" /> : null}
                {editingMocId ? "Cập nhật" : "Lưu mốc"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="cins-chat-workspace-add-moc"
            onClick={beginCreate}
          >
            <span aria-hidden>+</span>
            <span>
              <strong>Thêm mốc</strong>
              <em>Nhập tên, ngày, giờ, link và nhắc nhở</em>
            </span>
          </button>
        )
      ) : null}

      {error ? (
        <p className="cins-chat-side-empty cins-chat-workspace-error">{error}</p>
      ) : null}
      {loading ? (
        <p className="cins-chat-side-empty">Đang tải…</p>
      ) : mocs.length === 0 && !error ? (
        <p className="cins-chat-side-empty">Chưa có mốc làm việc.</p>
      ) : mocs.length === 0 ? null : (
        <div className="cins-chat-workspace-moc-lists">
          {upcomingMocs.length > 0 ? (
            <ol className="cins-chat-workspace-mocs" role="list">
              {upcomingMocs.map((moc) => renderMocItem(moc, false))}
            </ol>
          ) : (
            <p className="cins-chat-side-empty cins-chat-workspace-moc-upcoming-empty">
              Không còn mốc sắp tới.
            </p>
          )}

          {pastMocs.length > 0 ? (
            <div className="cins-chat-workspace-moc-past">
              {!showPastMocs ? (
                <button
                  type="button"
                  className="cins-chat-workspace-moc-past-toggle"
                  onClick={() => setShowPastMocs(true)}
                >
                  Xem {pastMocs.length} mốc đã qua
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="cins-chat-workspace-moc-past-toggle is-collapse"
                    onClick={() => setShowPastMocs(false)}
                  >
                    Ẩn mốc đã qua
                  </button>
                  <ol
                    className="cins-chat-workspace-mocs is-past-list"
                    role="list"
                  >
                    {pastMocs.map((moc) => renderMocItem(moc, true))}
                  </ol>
                </>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
