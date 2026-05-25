import type { ReactNode } from "react";

type Props = {
  num: string;
  title: ReactNode;
  meta?: string | null;
};

export function TruongEditorialHead({ num, title, meta }: Props) {
  return (
    <div className="editorial-head fade f2">
      <span className="eh-num">{num}</span>
      <h2 className="eh-title">{title}</h2>
      {meta ? <span className="eh-meta">{meta}</span> : <span className="eh-meta" aria-hidden />}
    </div>
  );
}
