"use client";

import { Clock, Search, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { isNgheNghiepHubPath, NGANH_HOC_HUB_PATH, NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";
import { TIM_KIEM_PATH } from "@/lib/search/paths";
import {
  clearRecentSearches,
  pushRecentSearch,
  readRecentSearches,
  RECENT_SEARCHES_CHANGE_EVENT,
  removeRecentSearch,
} from "@/lib/search/recent-searches-storage";

/** Ô tìm kiếm — đặt đầu sidebar (`sb-list`). Lưu tối đa 10 truy vấn gần đây. */
export function CinsTopbarSearch() {
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const isNganhHub = pathname.startsWith(NGANH_HOC_HUB_PATH);
  const isNgheHub = isNgheNghiepHubPath(pathname);
  const isTimKiem = pathname.startsWith(TIM_KIEM_PATH);

  const action = isNganhHub
    ? NGANH_HOC_HUB_PATH
    : isNgheHub
      ? NGHE_NGHIEP_HUB_PATH
      : TIM_KIEM_PATH;

  const q = sp.get("q") ?? "";
  const linhVuc = sp.get("linh_vuc") ?? "";
  const nhom = sp.get("nhom") ?? "";
  const kind = sp.get("kind") ?? "";

  const [draft, setDraft] = useState(q);
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setDraft(q);
  }, [q, pathname]);

  const refreshRecent = useCallback(() => {
    setRecent(readRecentSearches());
  }, []);

  useEffect(() => {
    refreshRecent();
    const onChange = () => refreshRecent();
    window.addEventListener(RECENT_SEARCHES_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(RECENT_SEARCHES_CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refreshRecent]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const draftLower = draft.trim().toLowerCase();
  const filtered = draftLower
    ? recent.filter((item) => item.toLowerCase().includes(draftLower))
    : recent;
  const showHistory = open && filtered.length > 0;

  const placeholder = "Tìm kiếm";

  const ariaLabel = isNganhHub
    ? "Tìm ngành học"
    : isNgheHub
      ? "Tìm vị trí công việc"
      : "Tìm kiếm trên CINs";

  function rememberAndClose(query: string) {
    const next = pushRecentSearch(query);
    setRecent(next);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const fd = new FormData(event.currentTarget);
    const query = String(fd.get("q") ?? "").trim();
    if (query) rememberAndClose(query);
  }

  function pickRecent(query: string) {
    setDraft(query);
    rememberAndClose(query);
    // Submit sau khi state cập nhật — dùng form native với value vừa set.
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.value = query;
      input.form?.requestSubmit();
    });
  }

  function onRemoveRecent(query: string, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setRecent(removeRecentSearch(query));
    setActiveIndex(-1);
  }

  function onClearAll(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    clearRecentSearches();
    setRecent([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showHistory) {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0 && filtered[activeIndex]) {
      event.preventDefault();
      pickRecent(filtered[activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={rootRef} className="sb-search-wrap">
      <form
        action={action}
        method="get"
        className="sb-search"
        role="search"
        onSubmit={onSubmit}
        onClick={() => inputRef.current?.focus()}
      >
        {isNganhHub && nhom ? <input type="hidden" name="nhom" value={nhom} /> : null}
        {isNgheHub && linhVuc ? (
          <input type="hidden" name="linh_vuc" value={linhVuc} />
        ) : null}
        {isTimKiem && kind && kind !== "all" ? (
          <input type="hidden" name="kind" value={kind} />
        ) : null}
        <span className="sb-ico" aria-hidden>
          <Search size={18} strokeWidth={1.8} />
        </span>
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => {
            refreshRecent();
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-controls={showHistory ? listId : undefined}
          aria-expanded={showHistory}
          autoComplete="off"
          className="sb-search-input"
        />
      </form>

      {showHistory ? (
        <div className="sb-search-history" id={listId} role="listbox" aria-label="Tìm gần đây">
          <div className="sb-search-history-head">
            <span>Tìm gần đây</span>
            <button
              type="button"
              className="sb-search-history-clear"
              onClick={onClearAll}
            >
              Xóa hết
            </button>
          </div>
          <ul className="sb-search-history-list">
            {filtered.map((item, index) => {
              const active = index === activeIndex;
              return (
                <li key={item} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`sb-search-history-item${active ? " is-active" : ""}`}
                    onClick={() => pickRecent(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <Clock size={14} strokeWidth={1.8} aria-hidden />
                    <span className="sb-search-history-text">{item}</span>
                  </button>
                  <button
                    type="button"
                    className="sb-search-history-remove"
                    aria-label={`Xóa «${item}» khỏi lịch sử`}
                    onClick={(e) => onRemoveRecent(item, e)}
                  >
                    <X size={14} strokeWidth={2} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
