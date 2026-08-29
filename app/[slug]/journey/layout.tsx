/* Intercept `@modal` render `JourneyPostBody` (không qua JourneyPostModal).
   Overlay click từ `/{slug}` tự import CSS; alias `/journey` cần CSS ở đây. */
import "../p/new/editor.css";
import "../p/[postSlug]/post-page.css";

/**
 * Parallel route slot `@modal` — nhận intercepted route khi user click cột
 * mốc trên journey để mở modal bài viết. URL update sang `/[slug]/p/...`
 * nhưng journey page (children) vẫn render bên dưới. Vào thẳng URL bài viết
 * KHÔNG đi qua intercepted route → fall back về `app/[slug]/p/[postSlug]/
 * page.tsx` standalone.
 */
export default function JourneyLayout({
  children,
  modal: _modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  void _modal;
  return children;
}
