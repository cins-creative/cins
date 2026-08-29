type Props = {
  children: React.ReactNode;
  /** `Trang-chu` = `/` khách · `Dang-nhap` = `/login` */
  screenLabel: "Trang-chu" | "Dang-nhap";
};

/** Landing full-page — không CinsShell (nav / topbar / chat). */
export function GuestHomeLanding({ children, screenLabel }: Props) {
  return (
    <div
      className="cins-guest-landing"
      data-screen-label={screenLabel}
      {...(screenLabel === "Trang-chu" ? { "data-cins-guest-home": "1" } : {})}
    >
      {children}
    </div>
  );
}
