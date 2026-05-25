type Props = { variant: number };

export function TruongCardCoverGeo({ variant }: Props) {
  const v = variant % 4;
  if (v === 1) {
    return (
      <svg viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <rect x="240" y="-20" width="80" height="80" rx="8" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" transform="rotate(15 280 20)" />
        <rect x="260" y="-5" width="80" height="80" rx="8" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" transform="rotate(15 300 35)" />
      </svg>
    );
  }
  if (v === 2) {
    return (
      <svg viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <polygon points="320,10 360,80 280,80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <polygon points="310,30 340,75 270,75" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      </svg>
    );
  }
  if (v === 3) {
    return (
      <svg viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <circle cx="300" cy="75" r="55" fill="rgba(255,255,255,0.05)" />
        <circle cx="300" cy="75" r="32" fill="rgba(255,255,255,0.04)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <circle cx="280" cy="30" r="60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <circle cx="280" cy="30" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <line x1="0" y1="150" x2="200" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
    </svg>
  );
}
