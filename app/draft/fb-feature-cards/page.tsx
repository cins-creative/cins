import type { Metadata } from "next";

import { FbFeatureCardsPresent } from "./FbFeatureCardsPresent";

export const metadata: Metadata = {
  title: "[Nháp] FB Feature Cards — CINs",
  robots: { index: false, follow: false },
};

export default function FbFeatureCardsDraftPage() {
  return <FbFeatureCardsPresent />;
}
