type Props = {
  num: string;
  title: string;
  hint: string;
};

export function CoSoTabPlaceholder({ num, title, hint }: Props) {
  return (
    <>
      <div className="sec-hdr">
        <span className="sec-num">{num}</span>
        <h2 className="sec-title">{title}</h2>
      </div>
      <p className="tdh-placeholder">{hint}</p>
    </>
  );
}
