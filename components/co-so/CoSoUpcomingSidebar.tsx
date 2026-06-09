export function CoSoUpcomingSidebar() {
  return (
    <aside className="tdh-admission-side" aria-label="Khai giảng sắp tới">
      <div className="tdh-admission-side-head">
        <div className="tdh-admission-side-year-row">
          <p className="timeline-year-kicker">Khai giảng sắp tới</p>
        </div>
      </div>
      <section className="timeline-section timeline-section--rail">
        <p className="ptxt-empty-text tdh-admission-side-empty">
          Chưa có lớp sắp khai giảng. Lịch khai giảng sẽ hiện khi bạn tạo khóa
          học và lớp.
        </p>
      </section>
    </aside>
  );
}
