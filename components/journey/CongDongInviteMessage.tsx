import Link from "next/link";

type Props = {
  inviterName: string;
  inviterSlug?: string | null;
  inviterAvatarUrl?: string | null;
  orgTen: string;
  orgSlug: string;
  className?: string;
};

export function CongDongInviteMessage({
  inviterName,
  inviterSlug,
  inviterAvatarUrl,
  orgTen,
  orgSlug,
  className = "j-coauthor-pending-message j-cong-dong-invite-message",
}: Props) {
  const orgHref = `/cong-dong/${encodeURIComponent(orgSlug)}`;
  const inviterHref = inviterSlug ? `/${encodeURIComponent(inviterSlug)}` : null;

  return (
    <p className={className}>
      {inviterAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={inviterAvatarUrl}
          alt=""
          className="j-coauthor-pending-avatar"
          width={28}
          height={28}
        />
      ) : (
        <span className="j-coauthor-pending-avatar is-fallback" aria-hidden>
          {(inviterName || "?").charAt(0).toUpperCase()}
        </span>
      )}
      <span>
        {inviterHref ? (
          <Link href={inviterHref} className="j-coauthor-pending-name">
            {inviterName}
          </Link>
        ) : (
          <strong>{inviterName}</strong>
        )}{" "}
        mời bạn tham gia cộng đồng{" "}
        <Link href={orgHref} className="j-coso-staff-invite-org-link">
          {orgTen}
        </Link>
        .
      </span>
    </p>
  );
}
