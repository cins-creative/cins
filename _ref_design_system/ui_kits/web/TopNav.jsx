// CINs UI Kit — Top Navigation
function TopNav({ active = 'home', onNavigate }) {
  const links = [
    { id: 'home', label: 'Trang chủ' },
    { id: 'schools', label: 'Trường Đại học' },
    { id: 'careers', label: 'Hướng nghiệp', caret: true },
    { id: 'articles', label: 'Bài viết', caret: true },
  ];
  return (
    <header className="cins-nav">
      <div className="cins-nav-inner">
        <div className="cins-logo" onClick={() => onNavigate?.('home')}>
          <img src="../../assets/logo-cins.png" alt="CINs" />
        </div>
        <nav className="cins-nav-links">
          {links.map(l => (
            <a
              key={l.id}
              className={`cins-nav-link ${active === l.id ? 'is-active' : ''}`}
              onClick={() => onNavigate?.(l.id)}
            >
              {l.label}{l.caret && <span className="cins-nav-caret">⌄</span>}
            </a>
          ))}
        </nav>
        <button className="cins-nav-search" aria-label="Tìm kiếm">⌕</button>
      </div>
    </header>
  );
}

Object.assign(window, { TopNav });
