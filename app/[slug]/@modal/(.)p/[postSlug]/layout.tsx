import { PostModalShell } from "@/components/journey/PostModalShell";

/** Shell giữ nguyên khi chuyển loading → page — tránh chớp overlay 2 lần. */
export default function InterceptedPostModalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PostModalShell>{children}</PostModalShell>;
}
