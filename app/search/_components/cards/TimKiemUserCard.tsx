"use client";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { JourneyFriendCard } from "@/components/journey/JourneyFriendCard";
import type { SearchHit } from "@/lib/search/types";
import type { MutualFriendProfile } from "@/lib/social/types";

/**
 * Thẻ người dùng trong kết quả tìm kiếm — tái dùng nguyên `JourneyFriendCard`
 * (thẻ bạn bè) nên có sẵn: bạn chung, thống kê, nút Nhắn tin / Kết bạn / Theo
 * dõi / Xem Journey. `hit.id` chính là `user_nguoi_dung.id`.
 */
export function TimKiemUserCard({ hit }: { hit: SearchHit }) {
  const { viewerProfileId } = useCinsChat();
  const meta = hit.userMeta;

  const friend: MutualFriendProfile = {
    idNguoiDung: hit.id,
    slug: hit.slug ?? "",
    tenHienThi: hit.title,
    avatarUrl: hit.avatarUrl,
    coverUrl: meta?.coverUrl ?? null,
    bio: meta?.bio ?? hit.snippet ?? null,
    giaiDoan: meta?.giaiDoanLabel ?? null,
    tinhThanh: meta?.locationLabel ?? null,
    stats: {
      cotMoc: meta?.stats.cotMoc ?? 0,
      tacPham: meta?.stats.tacPham ?? 0,
      banBe: meta?.stats.banBe ?? 0,
      toChucXacThuc: 0,
    },
  };

  return <JourneyFriendCard friend={friend} viewerProfileId={viewerProfileId} />;
}
