/** Tổng unread, bỏ phòng đang mở mini/overlay — không để FAB hiện số đỏ khi đang xem. */
export function sumUnreadExcludingRoom(
  threads: Array<{ roomId: string; unread: number }>,
  excludeRoomId: string | null | undefined,
): number {
  return threads.reduce((sum, t) => {
    if (excludeRoomId && t.roomId === excludeRoomId) return sum;
    return sum + Math.max(0, t.unread);
  }, 0);
}
