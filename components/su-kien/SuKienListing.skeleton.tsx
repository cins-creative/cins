export function SuKienListingSkeleton() {
  return (
    <div className="sk-list-page--loading" aria-busy="true">
      <div className="sk-hero sk-hero--skeleton" />
      <div className="sk-list-page">
        <div className="sk-list-toolbar sk-list-toolbar--skeleton" />
        <div className="evb-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="evb-card sk-list-card--skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}
