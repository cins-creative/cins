"use client";

import { Link2, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

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
  nhacTruocNgay: number;
};

function formatMocDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

  const tagName = useMemo(() => {
    const map = new Map(tags.map((t) => [t.id, t.ten]));
    return (id: string) => map.get(id) ?? "Thẻ";
  }, [tags]);

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
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={`cins-chat-workspace-tag${filterTagId === tag.id ? " is-active" : ""}`}
            onClick={() => setFilterTagId(tag.id)}
            style={tag.mau ? { borderColor: tag.mau } : undefined}
          >
            <Tag size={12} aria-hidden />
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
        ))}
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
                  {item.tagIds.length > 0 ? (
                    <div className="cins-chat-workspace-resource-tags">
                      {item.tagIds.map((id) => (
                        <span key={id}>{tagName(id)}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </button>
              {tags.length > 0 ? (
                <div className="cins-chat-workspace-resource-tag-edit">
                  {tags.map((tag) => {
                    const on = item.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`cins-chat-workspace-tag is-compact${on ? " is-active" : ""}`}
                        disabled={pending}
                        onClick={() => {
                          const next = on
                            ? item.tagIds.filter((id) => id !== tag.id)
                            : [...item.tagIds, tag.id];
                          startTransition(async () => {
                            const res = await fetch(
                              `/api/chat/rooms/${roomId}/messages/${item.messageId}/tags`,
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
                                row.messageId === item.messageId
                                  ? { ...row, tagIds: next }
                                  : row,
                              ),
                            );
                          });
                        }}
                      >
                        {tag.ten}
                      </button>
                    );
                  })}
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
}: {
  roomId: string;
  canManage: boolean;
}) {
  const [mocs, setMocs] = useState<MocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    ten: "",
    moTa: "",
    thoiDiem: "",
    url: "",
    nhacTruocNgay: 1,
  });
  const [showForm, setShowForm] = useState(false);

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

  const createMoc = () => {
    if (!canManage || pending) return;
    startTransition(async () => {
      const res = await fetch(`/api/chat/rooms/${roomId}/mocs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ten: draft.ten,
          mo_ta: draft.moTa || null,
          thoi_diem: draft.thoiDiem,
          url: draft.url || null,
          nhac_truoc_ngay: draft.nhacTruocNgay,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        moc?: MocRow;
        error?: string;
      } | null;
      if (!res.ok || !json?.moc) {
        setError(json?.error ?? "Không tạo được mốc.");
        return;
      }
      setDraft({ ten: "", moTa: "", thoiDiem: "", url: "", nhacTruocNgay: 1 });
      setShowForm(false);
      setMocs((prev) =>
        [...prev, json.moc!].sort((a, b) => a.thoiDiem.localeCompare(b.thoiDiem)),
      );
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
      setMocs((prev) => prev.filter((m) => m.id !== mocId));
    });
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="cins-chat-workspace-panel">
      {canManage ? (
        showForm ? (
          <div className="cins-chat-workspace-moc-form">
            <input
              type="text"
              placeholder="Tên mốc"
              value={draft.ten}
              maxLength={120}
              onChange={(e) => setDraft((d) => ({ ...d, ten: e.target.value }))}
            />
            <input
              type="date"
              value={draft.thoiDiem}
              onChange={(e) =>
                setDraft((d) => ({ ...d, thoiDiem: e.target.value }))
              }
              aria-label="Ngày mốc"
            />
            <textarea
              placeholder="Mô tả (tuỳ chọn)"
              value={draft.moTa}
              rows={2}
              onChange={(e) => setDraft((d) => ({ ...d, moTa: e.target.value }))}
            />
            <input
              type="url"
              placeholder="Link đính kèm (tuỳ chọn)"
              value={draft.url}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            />
            <label className="cins-chat-workspace-moc-remind">
              Nhắc trước
              <input
                type="number"
                min={0}
                max={30}
                value={draft.nhacTruocNgay}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    nhacTruocNgay: Number(e.target.value) || 0,
                  }))
                }
              />
              ngày
            </label>
            <div className="cins-chat-workspace-moc-form-actions">
              <button
                type="button"
                className="cins-chat-group-cancel"
                disabled={pending}
                onClick={() => setShowForm(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cins-chat-group-submit"
                disabled={pending || !draft.ten.trim() || !draft.thoiDiem}
                onClick={createMoc}
              >
                {pending ? <Loader2 size={14} className="spin" /> : null}
                Lưu mốc
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="cins-chat-workspace-add-moc"
            onClick={() => setShowForm(true)}
          >
            <span aria-hidden>+</span>
            <span>
              <strong>Thêm mốc</strong>
              <em>Nhập tên, ngày, link và nhắc nhở</em>
            </span>
          </button>
        )
      ) : null}

      {error ? <p className="cins-chat-side-empty">{error}</p> : null}
      {loading ? (
        <p className="cins-chat-side-empty">Đang tải…</p>
      ) : mocs.length === 0 ? (
        <p className="cins-chat-side-empty">Chưa có mốc làm việc.</p>
      ) : (
        <ol className="cins-chat-workspace-mocs" role="list">
          {mocs.map((moc) => {
            const past = moc.thoiDiem < today;
            return (
              <li
                key={moc.id}
                className={`cins-chat-workspace-moc${past ? " is-past" : ""}`}
              >
                <div className="cins-chat-workspace-moc-dot" aria-hidden />
                <div className="cins-chat-workspace-moc-body">
                  <time dateTime={moc.thoiDiem}>{formatMocDate(moc.thoiDiem)}</time>
                  <strong>{moc.ten}</strong>
                  {moc.moTa ? <p>{moc.moTa}</p> : null}
                  {moc.url ? (
                    <a href={moc.url} target="_blank" rel="noreferrer">
                      {moc.url}
                    </a>
                  ) : null}
                  <span className="cins-chat-workspace-moc-remind-meta">
                    Nhắc trước {moc.nhacTruocNgay} ngày
                  </span>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    className="cins-chat-icon-btn"
                    aria-label="Xóa mốc"
                    disabled={pending}
                    onClick={() => removeMoc(moc.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
