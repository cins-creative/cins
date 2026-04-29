// CINs UI Kit — Sidebar (Career browser tabs)
function Sidebar({ tabs, activeTab, onTabChange, items, activeItem, onItemSelect }) {
  return (
    <aside className="cins-sidebar">
      <div className="cins-sidebar-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`cins-sidebar-tab ${activeTab === t.id ? 'is-active' : ''}`}
            onClick={() => onTabChange?.(t.id)}
          >{t.label}</button>
        ))}
      </div>
      <div className="cins-sidebar-list">
        {items.map(it => (
          <button
            key={it.id}
            className={`cins-sidebar-item ${activeItem === it.id ? 'is-active' : ''}`}
            onClick={() => onItemSelect?.(it.id)}
          >{it.label}</button>
        ))}
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar });
