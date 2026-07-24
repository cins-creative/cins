"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { ChatReactionActor, ChatReactionSummary } from "@/lib/chat/types";

type Props = {
  reactions: ChatReactionSummary[];
  onToggle: (emoji: string, active: boolean) => void;
  placement?: "inline" | "corner";
  /**
   * Tin của mình (inline): click chip mở danh sách người thả (không toggle).
   * Corner: luôn gom 1 tab → click mở bảng chung.
   */
  revealActorsOnClick?: boolean;
};

type ActorRow = ChatReactionActor & { emoji: string };

function actorLabel(reaction: ChatReactionSummary): string {
  const names = (reaction.actors ?? [])
    .map((a) => a.name.trim())
    .filter(Boolean);
  if (names.length === 0) {
    return reaction.count === 1
      ? "1 người đã bày tỏ"
      : `${reaction.count} người đã bày tỏ`;
  }
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} và ${names.length - 3} người khác`;
}

function collectActorRows(reactions: ChatReactionSummary[]): ActorRow[] {
  const rows: ActorRow[] = [];
  const seen = new Set<string>();
  for (const reaction of reactions) {
    for (const actor of reaction.actors ?? []) {
      const key = `${actor.userId}:${reaction.emoji}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ ...actor, emoji: reaction.emoji });
    }
  }
  return rows;
}

export function ChatMessageReactions({
  reactions,
  onToggle,
  placement = "inline",
  revealActorsOnClick = false,
}: Props) {
  const listId = useId();
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const tabRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [openEmoji, setOpenEmoji] = useState<string | null>(null);
  const [openAll, setOpenAll] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setPortalReady(true));
  }, []);

  const visibleReactions = useMemo(
    () =>
      placement === "corner"
        ? [...reactions].sort((a, b) => b.count - a.count).slice(0, 3)
        : reactions,
    [placement, reactions],
  );

  const combinedActors = useMemo(
    () => collectActorRows(visibleReactions),
    [visibleReactions],
  );

  const totalPeople = useMemo(() => {
    const ids = new Set<string>();
    for (const reaction of visibleReactions) {
      for (const actor of reaction.actors ?? []) ids.add(actor.userId);
      if ((reaction.actors ?? []).length === 0 && reaction.count > 0) {
        /* Chưa có actors — tạm dùng count (có thể trùng người). */
        for (let i = 0; i < reaction.count; i++) {
          ids.add(`${reaction.emoji}:${i}`);
        }
      }
    }
    return ids.size;
  }, [visibleReactions]);

  const panelOpen = placement === "corner" ? openAll : Boolean(openEmoji);

  const placePanel = useCallback(() => {
    if (!panelOpen) return;
    const panel = panelRef.current;
    const anchor =
      placement === "corner"
        ? tabRef.current
        : openEmoji
          ? chipRefs.current.get(openEmoji) ?? null
          : null;
    if (!anchor || !panel) return;

    const rect = anchor.getBoundingClientRect();
    const mw = panel.offsetWidth;
    const mh = panel.offsetHeight;
    const pad = 8;
    const vv = window.visualViewport;
    const vw = vv?.width ?? window.innerWidth;
    const vh = vv?.height ?? window.innerHeight;
    const vTop = vv?.offsetTop ?? 0;
    const vLeft = vv?.offsetLeft ?? 0;

    let top = rect.top - mh - 6;
    let left = rect.right - mw;

    if (top < vTop + pad) top = rect.bottom + 6;
    if (top + mh > vTop + vh - pad) {
      top = Math.max(vTop + pad, vTop + vh - pad - mh);
    }
    if (left < vLeft + pad) left = vLeft + pad;
    if (left + mw > vLeft + vw - pad) {
      left = Math.max(vLeft + pad, vLeft + vw - pad - mw);
    }

    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${Math.round(left)}px`;
  }, [openEmoji, panelOpen, placement]);

  useLayoutEffect(() => {
    if (!panelOpen) return;
    placePanel();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", placePanel);
    vv?.addEventListener("scroll", placePanel);
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    return () => {
      vv?.removeEventListener("resize", placePanel);
      vv?.removeEventListener("scroll", placePanel);
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
    };
  }, [panelOpen, placePanel, reactions]);

  useEffect(() => {
    if (!panelOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const panel = panelRef.current;
      if (panel?.contains(target)) return;
      if (placement === "corner") {
        if (tabRef.current?.contains(target)) return;
        setOpenAll(false);
        return;
      }
      if (openEmoji) {
        const chip = chipRefs.current.get(openEmoji);
        if (chip?.contains(target)) return;
      }
      setOpenEmoji(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenAll(false);
        setOpenEmoji(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openEmoji, panelOpen, placement]);

  if (reactions.length === 0) return null;

  const openReaction =
    placement !== "corner" && openEmoji
      ? visibleReactions.find((r) => r.emoji === openEmoji) ?? null
      : null;

  const actorsPanel =
    portalReady && panelOpen
      ? createPortal(
          <div
            ref={panelRef}
            id={
              placement === "corner"
                ? `${listId}-all`
                : openReaction
                  ? `${listId}-${openReaction.emoji}`
                  : undefined
            }
            className="cins-chat-reaction-actors is-floating"
            role="dialog"
            aria-label={
              placement === "corner"
                ? "Người đã thả reaction"
                : openReaction
                  ? `Người thả ${openReaction.emoji}`
                  : "Người đã thả reaction"
            }
          >
            <p className="cins-chat-reaction-actors-head">
              {placement === "corner" ? (
                <>
                  <span className="cins-chat-reaction-actors-emojis" aria-hidden>
                    {visibleReactions.map((r) => r.emoji).join("")}
                  </span>
                  <span>
                    {totalPeople === 1
                      ? "1 người"
                      : `${totalPeople} người`}
                  </span>
                </>
              ) : openReaction ? (
                <>
                  <span aria-hidden>{openReaction.emoji}</span>
                  <span>
                    {openReaction.count === 1
                      ? "1 người"
                      : `${openReaction.count} người`}
                  </span>
                </>
              ) : null}
            </p>
            {placement === "corner" ? (
              combinedActors.length > 0 ? (
                <ul className="cins-chat-reaction-actors-list" role="list">
                  {combinedActors.map((actor) => (
                    <li
                      key={`${actor.userId}-${actor.emoji}`}
                      className="cins-chat-reaction-actor"
                    >
                      {actor.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="cins-chat-reaction-actor-av"
                          src={actor.avatarUrl}
                          alt=""
                        />
                      ) : (
                        <span
                          className="cins-chat-reaction-actor-av is-fallback"
                          aria-hidden
                        >
                          {actor.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="cins-chat-reaction-actor-name">
                        {actor.name}
                      </span>
                      <span
                        className="cins-chat-reaction-actor-emoji"
                        aria-hidden
                      >
                        {actor.emoji}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cins-chat-reaction-actors-empty">
                  Chưa tải được danh sách.
                </p>
              )
            ) : openReaction && (openReaction.actors ?? []).length > 0 ? (
              <ul className="cins-chat-reaction-actors-list" role="list">
                {(openReaction.actors ?? []).map((actor) => (
                  <li key={actor.userId} className="cins-chat-reaction-actor">
                    {actor.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="cins-chat-reaction-actor-av"
                        src={actor.avatarUrl}
                        alt=""
                      />
                    ) : (
                      <span
                        className="cins-chat-reaction-actor-av is-fallback"
                        aria-hidden
                      >
                        {actor.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="cins-chat-reaction-actor-name">
                      {actor.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cins-chat-reaction-actors-empty">
                Chưa tải được danh sách.
              </p>
            )}
          </div>,
          document.body,
        )
      : null;

  if (placement === "corner") {
    const mine = visibleReactions.some((r) => r.viewerReacted);
    return (
      <div
        className="cins-chat-reactions is-corner"
        role="group"
        aria-label="Reaction"
      >
        <button
          ref={tabRef}
          type="button"
          className={`cins-chat-reaction-tab${mine ? " is-mine" : ""}${openAll ? " is-open" : ""}`}
          aria-expanded={openAll}
          aria-controls={`${listId}-all`}
          title={
            totalPeople === 1
              ? "1 người đã bày tỏ"
              : `${totalPeople} người đã bày tỏ`
          }
          onClick={() => setOpenAll((prev) => !prev)}
        >
          <span className="cins-chat-reaction-tab-emojis" aria-hidden>
            {visibleReactions.map((reaction) => (
              <span key={reaction.emoji}>{reaction.emoji}</span>
            ))}
          </span>
          {totalPeople > 1 ? (
            <span className="cins-chat-reaction-tab-count">{totalPeople}</span>
          ) : null}
        </button>
        {actorsPanel}
      </div>
    );
  }

  return (
    <div className="cins-chat-reactions" role="group" aria-label="Reaction">
      {visibleReactions.map((reaction) => {
        const isOpen = openEmoji === reaction.emoji;
        const actors = reaction.actors ?? [];
        const canReveal =
          revealActorsOnClick && (actors.length > 0 || reaction.count > 0);

        return (
          <div key={reaction.emoji} className="cins-chat-reaction-wrap">
            <button
              ref={(el) => {
                if (el) chipRefs.current.set(reaction.emoji, el);
                else chipRefs.current.delete(reaction.emoji);
              }}
              type="button"
              className={`cins-chat-reaction-chip${reaction.viewerReacted ? " is-mine" : ""}${isOpen ? " is-open" : ""}`}
              aria-pressed={canReveal ? undefined : reaction.viewerReacted}
              aria-expanded={canReveal ? isOpen : undefined}
              aria-controls={
                canReveal ? `${listId}-${reaction.emoji}` : undefined
              }
              title={canReveal ? actorLabel(reaction) : undefined}
              onClick={() => {
                if (canReveal) {
                  setOpenEmoji((prev) =>
                    prev === reaction.emoji ? null : reaction.emoji,
                  );
                  return;
                }
                onToggle(reaction.emoji, !reaction.viewerReacted);
              }}
            >
              <span aria-hidden>{reaction.emoji}</span>
              {reaction.count > 1 ? (
                <span className="cins-chat-reaction-count">{reaction.count}</span>
              ) : null}
            </button>
          </div>
        );
      })}
      {actorsPanel}
    </div>
  );
}
