function contactBadgeModifier(roleKey: string): string {
  const key = roleKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (
    key === "admin" ||
    key === "owner" ||
    key === "quan_ly_noi_dung" ||
    key === "quan_ly_tuyen_sinh"
  ) {
    return "admin";
  }
  if (key === "giao_vien") return "giao_vien";
  if (key === "nhan_vien") return "nhan_vien";
  if (key === "hoc_vien" || key === "thanh_vien") return "hoc_vien";
  if (key === "nguoi_la") return "nguoi_la";
  return "default";
}

type InboxContactRoleBadgeProps = {
  label: string;
  roleKey: string;
  className?: string;
};

export function InboxContactRoleBadge({
  label,
  roleKey,
  className = "",
}: InboxContactRoleBadgeProps) {
  if (!label.trim()) return null;

  const modifier = contactBadgeModifier(roleKey);
  return (
    <span
      className={`tdh-message-inbox-contact-badge tdh-message-inbox-contact-badge--${modifier}${className ? ` ${className}` : ""}`}
    >
      {label}
    </span>
  );
}
