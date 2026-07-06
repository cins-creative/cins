import {
  galleryMediaKindFromBlocks,
  milestoneCardCaptionPlain,
} from "@/lib/journey/post-media";
import { loaiBaiDangLabel } from "@/lib/truong/bai-dang";
import { baiDangGridPreviewUrl } from "@/lib/truong/bai-dang-cover";
import { baiDangYear } from "@/lib/truong/bai-dang-timeline";
import type { TruongBaiDang } from "@/lib/truong/types";

/** Hai chế độ xem bài đăng tổ chức — mặc định timeline (giống World Journey). */
export type OrgBaiDangView = "timeline" | "grid";

export type OrgBaiDangGridItem = {
  id: string;
  title: string;
  excerpt: string | null;
  thumbSrc: string | null;
  isVideo: boolean;
  loaiLabel: string;
  year: number | null;
};

/** Map bài đăng tổ chức → ô lưới (cover/ảnh đầu + tiêu đề + trích đoạn). */
export function orgBaiDangPostsToGridItems(
  posts: ReadonlyArray<TruongBaiDang>,
): OrgBaiDangGridItem[] {
  return posts.map((post) => ({
    id: post.id,
    title: post.tieu_de?.trim() || "Bài đăng",
    excerpt: milestoneCardCaptionPlain(post.tom_tat, post.noiDungBlocks ?? null),
    thumbSrc: baiDangGridPreviewUrl(post),
    isVideo: galleryMediaKindFromBlocks(post.noiDungBlocks) === "video",
    loaiLabel: loaiBaiDangLabel(post.loai_bai_dang),
    year: baiDangYear(post.tao_luc),
  }));
}
