import Link from "next/link";

import { ContributionTabActions } from "@/components/article/contribution/ContributionTabActions";
import { ContributionTopicCard } from "@/components/article/contribution/ContributionTopicCard";
import type {
  ContributionPublicItem,
  ViewerContributionEditorState,
} from "@/lib/article/dong-gop/public-list";

type Props = {
  items: ContributionPublicItem[];
  count: number;
  isLoggedIn: boolean;
  viewerHasDraft: boolean;
  loginNext: string;
  idBaiViet: string;
  articleTitle: string;
  loaiBaiViet: string;
  viewerEditor: ViewerContributionEditorState | null;
};

export function ContributionTabPanel({
  items,
  count,
  isLoggedIn,
  viewerHasDraft,
  loginNext,
  idBaiViet,
  articleTitle,
  loaiBaiViet,
  viewerEditor,
}: Props) {
  const loginHref = `/login?next=${encodeURIComponent(loginNext)}`;

  return (
    <div className="contrib-tab">
      <header className="contrib-tab-header">
        <div className="contrib-tab-header-text">
          <h2 className="contrib-tab-title">Bản đóng góp</h2>
          <p className="contrib-tab-sub">
            {count > 0
              ? `${count} topic từ cộng đồng — thảo luận ngay dưới mỗi topic như trên Journey.`
              : "Mỗi người soạn một bài riêng — curator sẽ chọn bản phù hợp làm nội dung chính."}
          </p>
        </div>
        <ContributionTabActions
          isLoggedIn={isLoggedIn}
          loginNext={loginNext}
          idBaiViet={idBaiViet}
          articleTitle={articleTitle}
          loaiBaiViet={loaiBaiViet}
          contributionCount={count}
          viewerHasDraft={viewerHasDraft}
          viewerEditor={viewerEditor}
        />
      </header>

      {items.length === 0 ? (
        <div className="contrib-tab-empty">
          <p>Chưa có bản đóng góp — hãy là người đầu tiên.</p>
          {!isLoggedIn ? (
            <Link href={loginHref} className="contrib-tab-empty-link">
              Đăng nhập để bắt đầu →
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="contrib-tab-list">
          {items.map((item) => (
            <ContributionTopicCard
              key={item.id}
              item={item}
              isLoggedIn={isLoggedIn}
              loaiBaiViet={loaiBaiViet}
              defaultOpen={item.isViewerOwn}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
