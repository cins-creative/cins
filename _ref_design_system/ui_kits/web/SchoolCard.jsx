// CINs UI Kit — School Card
function SchoolCard({ name, code, type = 'public', locations = [], crest, crestColor, photoTone = 'a' }) {
  return (
    <article className="cins-school-card">
      <div className={`cins-school-photo cins-school-photo-${photoTone}`}>
        <div className="cins-school-crest" style={{ color: crestColor || 'var(--cins-blue)' }}>{crest}</div>
      </div>
      <div className="cins-school-body">
        <h3 className="cins-school-name">{name}</h3>
        <div className="cins-school-row">
          <span className="cins-school-code">Mã trường: {code}</span>
          <span className={`cins-badge cins-badge-${type === 'public' ? 'public' : 'private'}`}>
            {type === 'public' ? 'Công lập' : 'Dân lập'}
          </span>
        </div>
        <div className="cins-school-row cins-school-locations">
          <span className="cins-pin">▸</span>
          <span>{locations.join(' · ')}</span>
        </div>
      </div>
    </article>
  );
}

Object.assign(window, { SchoolCard });
