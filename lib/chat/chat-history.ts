import { isChatPagePath } from "@/lib/chat/chat-page-path";
import { slugifyTagName } from "@/lib/chat/tag-colors";
import {
  CHAT_INBOX_QUERY,
  CHAT_ROOM_QUERY,
  CHAT_ROUTE_HREF,
  withSearchParam,
} from "@/lib/navigation/overlay-history";

/** Khớp `@media` ẩn list / hiện convo full (`cins-chat-overlay.css`). */
export const CHAT_MOBILE_STACK_MQ = "(max-width: 767.98px)";

/** Query cũ — vẫn đọc khi bookmark / push cũ. */
export const CHAT_ROOM_QUERY_LEGACY = "phong";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^(.+)-([0-9a-f]{8})$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isChatMobileStack(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(CHAT_MOBILE_STACK_MQ).matches;
}

export type ChatRoomUrlFields = {
  roomId: string;
  peerSlug?: string | null;
  orgSlug?: string | null;
  name?: string | null;
};

export function chatRoomShortId(roomId: string): string | null {
  if (!UUID_RE.test(roomId)) return null;
  return roomId.slice(0, 8).toLowerCase();
}

function labelToSlug(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (SLUG_RE.test(trimmed)) return trimmed;
  return slugifyTagName(value) || "phong";
}

/** Slug trên URL: peer Journey → org → tên phòng. */
export function slugForChatRoomUrl(thread: ChatRoomUrlFields): string {
  const peer = thread.peerSlug?.trim();
  if (peer) return labelToSlug(peer);
  const org = thread.orgSlug?.trim();
  if (org) return labelToSlug(org);
  return labelToSlug(thread.name ?? "") || "phong";
}

/** `danthu-e274e7d7` — null nếu chưa có UUID phòng thật. */
export function encodeChatRoomQuery(thread: ChatRoomUrlFields): string | null {
  const shortId = chatRoomShortId(thread.roomId);
  if (!shortId) return null;
  return `${slugForChatRoomUrl(thread)}-${shortId}`;
}

export function chatRoomHref(query: string): string {
  return withSearchParam(CHAT_ROOM_QUERY, query, CHAT_ROUTE_HREF);
}

export function chatInboxHref(): string {
  return withSearchParam(CHAT_INBOX_QUERY, "1", CHAT_ROUTE_HREF);
}

export type ParsedChatRoomQuery =
  | { roomId: string }
  | { slug: string; shortId: string };

export function parseChatRoomQuery(raw: string): ParsedChatRoomQuery | null {
  const token = raw.trim();
  if (!token) return null;
  if (UUID_RE.test(token)) return { roomId: token.toLowerCase() };
  const m = token.match(TOKEN_RE);
  if (!m) return null;
  return { slug: m[1].toLowerCase(), shortId: m[2].toLowerCase() };
}

export function chatRoomQueryMatchesRoom(
  query: string,
  roomId: string,
): boolean {
  const parsed = parseChatRoomQuery(query);
  if (!parsed) return false;
  const id = roomId.toLowerCase();
  if ("roomId" in parsed) return parsed.roomId === id;
  return id.startsWith(parsed.shortId);
}

export function matchThreadByChatRoomQuery<T extends ChatRoomUrlFields>(
  threads: T[],
  parsed: ParsedChatRoomQuery | null,
): T | undefined {
  if (!parsed) return undefined;
  if ("roomId" in parsed) {
    return threads.find((t) => t.roomId.toLowerCase() === parsed.roomId);
  }
  const hits = threads.filter((t) =>
    t.roomId.toLowerCase().startsWith(parsed.shortId),
  );
  if (hits.length === 0) return undefined;
  if (hits.length === 1) return hits[0];
  return (
    hits.find((t) => slugForChatRoomUrl(t) === parsed.slug) ?? hits[0]
  );
}

export function readChatRoomQueryParam(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  return (
    url.searchParams.get(CHAT_ROOM_QUERY)?.trim() ||
    url.searchParams.get(CHAT_ROOM_QUERY_LEGACY)?.trim() ||
    null
  );
}

export type ChatChildLocation =
  | { kind: "room"; query: string }
  | { kind: "inbox" }
  | { kind: "list" };

export function readChatChildFromLocation(): ChatChildLocation {
  if (typeof window === "undefined") return { kind: "list" };
  if (!isChatPagePath(window.location.pathname)) return { kind: "list" };
  const url = new URL(window.location.href);
  if (url.searchParams.get(CHAT_INBOX_QUERY) === "1") return { kind: "inbox" };
  const query = readChatRoomQueryParam();
  if (query) return { kind: "room", query };
  return { kind: "list" };
}
