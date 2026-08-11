type Props = {
  mode?: "shop" | "hang";
};

export function CuaHangListingSkeleton({ mode = "hang" }: Props) {
  return (
    <div className="ch-list-page ch-list-page--loading" aria-busy="true">
      <div className="ch-list-toolbar">
        <div className="cins-frost-glass" aria-hidden />
        <div className="ch-list-toolbar-inner">
          <div className="ch-list-toolbar--skeleton" />
        </div>
      </div>
      <div className="ch-list-body">
        {mode === "shop" ? (
          <div className="ch-list-grid">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="ch-list-card ch-list-card--skeleton" />
            ))}
          </div>
        ) : (
          <div className="ch-list-hang-grid">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="ch-list-hang-card ch-list-hang-card--skeleton"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
