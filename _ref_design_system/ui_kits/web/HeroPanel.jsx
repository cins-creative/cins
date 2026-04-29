// CINs UI Kit — Hero / Discovery panel
function HeroPanel({ eyebrow, title, body, illustration, placeholder, onSearch }) {
  const [val, setVal] = React.useState('');
  return (
    <section className="cins-hero">
      <div className="cins-hero-text">
        <div className="cins-eyebrow-soft">{eyebrow}</div>
        <h1 className="cins-h1">{title}</h1>
        {body && <p className="cins-hero-body">{body}</p>}
        {placeholder && (
          <form className="cins-search-field"
                onSubmit={e => { e.preventDefault(); onSearch?.(val); }}>
            <input
              value={val}
              onChange={e => setVal(e.target.value)}
              placeholder={placeholder}
            />
          </form>
        )}
      </div>
      {illustration && (
        <div className="cins-hero-illust">
          <img src={illustration} alt="" />
        </div>
      )}
    </section>
  );
}

Object.assign(window, { HeroPanel });
