import type { ReactNode } from "react";

type InviteCopy = {
  ownerName: string;
  postTitle: string;
  vaiTro?: string | null;
};

type Props = InviteCopy & {
  className?: string;
};

/** Một câu mời đồng tác giả — dùng banner timeline + dropdown thông báo. */
export function CoAuthorInviteMessage({
  ownerName,
  postTitle,
  vaiTro,
  className = "j-coauthor-invite-message",
}: Props): ReactNode {
  const role = vaiTro?.trim();
  return (
    <p className={className}>
      <strong>{ownerName}</strong> mời bạn làm đồng tác giả cho tác phẩm{" "}
      <cite className="j-coauthor-invite-work">&ldquo;{postTitle}&rdquo;</cite>
      {role ? (
        <>
          {" "}
          với vai trò <em>{role}</em>
        </>
      ) : null}
      .
    </p>
  );
}
