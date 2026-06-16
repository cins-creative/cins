type Props = {
  children: React.ReactNode;
  cardLabel?: string;
  wide?: boolean;
};

export function TaoToChucPageShell({
  children,
  cardLabel = "Tạo tổ chức",
  wide = false,
}: Props) {
  const cardClass = wide
    ? "cins-login-card ttc-login-card--wide"
    : "cins-login-card";

  return (
    <div className="ttc-page">
      <div className="ttc-page-bg-deco" aria-hidden>
        <span className="cins-login-blob cins-login-blob--y" />
        <span className="cins-login-blob cins-login-blob--m" />
        <span className="cins-login-blob cins-login-blob--o" />
        <span className="cins-login-blob cins-login-blob--v" />
      </div>

      <div className="ttc-page-main">
        <section className={cardClass} aria-label={cardLabel}>
          {children}
        </section>
      </div>
    </div>
  );
}
