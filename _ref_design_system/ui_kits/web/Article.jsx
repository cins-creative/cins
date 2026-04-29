// CINs UI Kit — Article header (career detail / blog post)
function ArticleHeader({ eyebrow, title, body, illustration, tags, department }) {
  return (
    <header className="cins-article-header">
      <div className="cins-article-text">
        <div className="cins-eyebrow-soft">{eyebrow}</div>
        <h1 className="cins-article-title">{title}</h1>
        {body && <p className="cins-article-body">{body}</p>}
        {tags && tags.length > 0 && (
          <div className="cins-article-meta">
            <span className="cins-meta-label">Hoạt động trong:</span>
            <div className="cins-tag-row">
              {tags.map(t => <span key={t} className="cins-tag">{t}</span>)}
            </div>
          </div>
        )}
        {department && (
          <div className="cins-article-meta">
            <span className="cins-meta-label">Bộ phận:</span>
            <span className="cins-meta-value">{department}</span>
          </div>
        )}
      </div>
      {illustration && (
        <div className="cins-article-illust">
          <img src={illustration} alt="" />
        </div>
      )}
    </header>
  );
}

function KeywordPanel({ activeTab, onTabChange, keywordTitle, keywordBody, keywordImage, items, activeItem, onItemSelect }) {
  return (
    <aside className="cins-keyword-panel">
      <div className="cins-keyword-tabs">
        {['Vị trí', 'Phần mềm', 'Keyword'].map(t => (
          <button
            key={t}
            className={`cins-keyword-tab ${activeTab === t ? 'is-active' : ''}`}
            onClick={() => onTabChange?.(t)}
          >{t}</button>
        ))}
      </div>
      {keywordTitle && (
        <div className="cins-keyword-feature">
          <div className="cins-keyword-feature-head">
            <span className="cins-keyword-feature-title">{keywordTitle}</span>
            <span className="cins-keyword-ext">↗</span>
          </div>
          <p className="cins-keyword-feature-body">{keywordBody}</p>
          {keywordImage && <img className="cins-keyword-feature-img" src={keywordImage} alt="" />}
        </div>
      )}
      <div className="cins-keyword-list">
        {items.map(it => (
          <button
            key={it}
            className={`cins-keyword-item ${activeItem === it ? 'is-active' : ''}`}
            onClick={() => onItemSelect?.(it)}
          >{it}</button>
        ))}
      </div>
    </aside>
  );
}

Object.assign(window, { ArticleHeader, KeywordPanel });
