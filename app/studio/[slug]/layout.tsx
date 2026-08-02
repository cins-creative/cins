import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** Layout chung slug — không gắn public detail shell (xem `(public)/layout`). */
export default function StudioSlugLayout({ children }: Props) {
  return children;
}
