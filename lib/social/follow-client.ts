/** Đồng bộ trạng thái theo dõi user giữa các nút trên client. */
export const USER_FOLLOW_CHANGED = "cins:user-follow-changed";

export function emitUserFollowChanged(
  targetUserId: string,
  following: boolean,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(USER_FOLLOW_CHANGED, {
      detail: { targetUserId, following },
    }),
  );
}
